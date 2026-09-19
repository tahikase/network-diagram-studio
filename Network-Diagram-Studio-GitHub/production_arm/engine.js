(function () {
  'use strict';

  // The factory is serialized into a classic Blob Worker. Keep every dependency inside it.
  globalThis.ndsArmEngine = function createArmEngine() {
    'use strict';

    // Fixed safety limits; options cannot increase them.
    const MAX_BYTES = 10 * 1024 * 1024;
    const MAX_RESOURCES = 2000;
    const MAX_RENDERED_NODES = 300;
    const MAX_SUPPORT_ENTRIES = 12000;
    const MAX_DEPTH = 64;
    const MAX_EXPRESSION = 16384;
    const MAX_TOKENS = 4096;
    const MAX_STEPS = 500000;
    const MAX_VALUE = 65536;
    const NETWORK = 'microsoft.network/';
    const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor']);

    class ArmError extends Error {
      constructor(message, fatal = false) {
        super(message);
        this.name = 'ArmImportError';
        this.fatal = fatal;
      }
    }

    // A scoped identity is not a string: concatenation must preserve its scope provenance.
    class ArmId {
      constructor(path, group, subscription, level, local) {
        this.path = path;
        this.group = group;
        this.subscription = subscription;
        this.level = level;
        this.local = local;
      }
    }

    function convert(rawString, options = {}, onProgress = () => {}) {
      let steps = 0;
      let evalDepth = 0;
      let resourceBudget = 0;
      let resourceCount = 0;
      let parameterDefaultsUsed = false;
      const warnings = new Set();
      const summaries = new Map();
      const records = [];
      const allRecords = [];
      const indexes = new Map();
      const exactIds = new Map();
      const expressions = new Map();
      const activeNames = new Set();
      const valueCache = new Map();
      const activeMembers = new WeakMap();
      const nodeByRecord = new Map();
      const nodeById = new Map();
      const sourceByNode = new Map();
      const edgeKeys = new Set();
      const edges = [];
      const notesDetails = [];
      const missing = Symbol('missing');
      const progress = (percent, stage) => onProgress({ percent, stage });
      const tick = () => {
        if (++steps > MAX_STEPS) throw new ArmError('ARM processing limit reached. Simplify the template or export a smaller resource group.', true);
      };
      const fail = message => { throw new ArmError(message); };
      const warn = message => { warnings.add(message); };
      const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof ArmId);
      const own = (object, key) => object != null && Object.prototype.hasOwnProperty.call(object, key);
      const ci = (object, key) => {
        if (!isObject(object)) return undefined;
        if (own(object, key)) return object[key];
        const found = Object.keys(object).find(k => k.toLowerCase() === key.toLowerCase());
        return found === undefined ? undefined : object[found];
      };
      const boundedText = (value, max, description) => {
        // oxlint-disable-next-line no-control-regex -- Reject control characters in imported display text.
        if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) {
          fail(description + ' must be a nonempty, bounded text value.');
        }
        return value;
      };
      const safeSymbol = name => /^[a-zA-Z0-9_.-]{1,100}$/.test(name) ? "'" + name + "'" : '(nonstandard name)';
      // Notes is Markdown, unlike the text-only report UI. Escape HTML, links and bare-URL syntax too.
      // oxlint-disable-next-line no-control-regex -- Sanitize control characters before composing Markdown.
      const markdownText = text => String(text).replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/[\\`*_{}[\]()#+\-.!|<>&:/~]/g, '\\$&');
      const summarize = (type, reason, count = 1) => {
        const key = type.toLowerCase() + '|' + reason;
        const entry = summaries.get(key);
        if (entry) entry.count += count;
        else summaries.set(key, { type, count, reason });
      };
      const countResource = () => {
        if (++resourceBudget > MAX_RESOURCES) throw new ArmError('Template exceeds the 2,000-resource limit, including embedded resources. Export a smaller scope.', true);
      };

      progress(15, 'parse');
      if (typeof rawString !== 'string') fail('Provide ARM template JSON as text.');
      if (rawString.length > MAX_BYTES || new TextEncoder().encode(rawString).length > MAX_BYTES) {
        throw new ArmError('Template exceeds the 10 MiB JSON limit. Export a smaller scope.', true);
      }
      let depth = 0;
      let inString = false;
      let escaped = false;
      for (let i = 0; i < rawString.length; i++) {
        const c = rawString[i];
        if (inString) {
          if (escaped) escaped = false;
          else if (c === '\\') escaped = true;
          else if (c === '"') inString = false;
        } else if (c === '"') inString = true;
        else if (c === '{' || c === '[') {
          if (++depth > MAX_DEPTH) throw new ArmError('Template exceeds the maximum JSON depth of 64.', true);
        } else if (c === '}' || c === ']') depth--;
      }
      let template;
      try {
        template = JSON.parse(rawString.charCodeAt(0) === 0xfeff ? rawString.slice(1) : rawString);
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        // Native JSON parse errors can include snippets of secret-bearing input.
        fail('Invalid JSON. Select an ARM template JSON file, not a parameters file or deployment log.');
      }
      if (!isObject(template) || !own(template, 'resources')) fail('This JSON has no ARM resources collection. Select a template, not a parameters file.');
      if (!isObject(options)) fail('Import options must be an object.');
      const groupName = options.resourceGroupName === undefined || (typeof options.resourceGroupName === 'string' && !options.resourceGroupName.trim())
        ? '' : boundedText(options.resourceGroupName, 90, 'Resource group name').trim();
      const subscription = options.subscriptionId === undefined || (typeof options.subscriptionId === 'string' && !options.subscriptionId.trim())
        ? '' : boundedText(options.subscriptionId, 100, 'Subscription ID').trim();
      const title = options.title === undefined || options.title === '' ? 'ARM network diagram' : boundedText(options.title, 256, 'Diagram title');
      const parameters = ci(template, 'parameters') || {};
      const variables = ci(template, 'variables') || {};
      if (!isObject(parameters) || !isObject(variables)) fail('ARM parameters and variables must be objects.');
      const namedIndex = object => {
        const result = new Map();
        for (const key of Object.keys(object)) {
          const lower = key.toLowerCase();
          if (result.has(lower)) fail('Ambiguous case-insensitive ARM parameter or variable names. Use unique names.');
          result.set(lower, key);
        }
        return result;
      };
      const parameterKeys = namedIndex(parameters);
      const variableKeys = namedIndex(variables);

      function parseExpression(text) {
        if (text.length > MAX_EXPRESSION) throw new ArmError('ARM expression exceeds the 16,384-character limit.', true);
        if (expressions.has(text)) return expressions.get(text);
        let pos = 1;
        let tokenCount = 0;
        let nesting = 0;
        const end = text.length - 1;
        const skip = () => { while (pos < end && /\s/.test(text[pos])) pos++; };
        const take = c => { skip(); if (text[pos] === c) { pos++; return true; } return false; };
        const bad = () => fail('Unsupported or malformed ARM expression. Export resolved resource names and network properties.');
        function expression() {
          tick();
          if (++tokenCount > MAX_TOKENS || ++nesting > MAX_DEPTH) throw new ArmError('ARM expression complexity exceeds the safety limit.', true);
          skip();
          let node;
          if (text[pos] === "'") {
            pos++;
            let value = '';
            let closed = false;
            while (pos < end) {
              const c = text[pos++];
              if (c === "'") {
                if (text[pos] === "'") { value += "'"; pos++; }
                else { closed = true; break; }
              } else value += c;
            }
            if (!closed) bad();
            node = { kind: 'literal', value };
          } else {
            const number = text.slice(pos, end).match(/^-?\d+(?:\.\d+)?/);
            if (number) {
              pos += number[0].length;
              const value = Number(number[0]);
              if (!Number.isFinite(value)) bad();
              node = { kind: 'literal', value };
            } else {
              const identifier = text.slice(pos, end).match(/^[A-Za-z_][A-Za-z0-9_]*/);
              if (!identifier) bad();
              const name = identifier[0].toLowerCase();
              pos += identifier[0].length;
              if (!take('(')) {
                if (!['true', 'false', 'null'].includes(name)) bad();
                node = { kind: 'literal', value: name === 'null' ? null : name === 'true' };
              } else {
                const args = [];
                if (!take(')')) {
                  do { args.push(expression()); } while (take(','));
                  if (!take(')')) bad();
                }
                node = { kind: 'call', name, args };
              }
            }
          }
          while (true) {
            if (take('.')) {
              const key = text.slice(pos, end).match(/^[A-Za-z_][A-Za-z0-9_]*/);
              if (!key) bad();
              pos += key[0].length;
              node = { kind: 'member', target: node, key: { kind: 'literal', value: key[0] } };
            } else if (take('[')) {
              const key = expression();
              if (!take(']')) bad();
              node = { kind: 'member', target: node, key };
            } else break;
            if (++tokenCount > MAX_TOKENS) throw new ArmError('ARM expression complexity exceeds the safety limit.', true);
          }
          nesting--;
          return node;
        }
        if (!text.endsWith(']')) bad();
        const ast = expression();
        skip();
        if (pos !== end) bad();
        expressions.set(text, ast);
        return ast;
      }

      function resolve(value) {
        tick();
        if (++evalDepth > MAX_DEPTH) { evalDepth--; throw new ArmError('ARM resolution depth exceeds 64; check recursive variables.', true); }
        try {
          if (typeof value !== 'string') return value;
          if (value.length > MAX_VALUE) throw new ArmError('A requested ARM network value exceeds the 65,536-character limit.', true);
          if (value.startsWith('[[')) return value.slice(1);
          return value.startsWith('[') ? evaluate(parseExpression(value)) : value;
        } finally { evalDepth--; }
      }

      function member(object, key) {
        tick();
        if (unsafeKeys.has(String(key).toLowerCase())) fail('Prototype-related ARM property access is not supported.');
        if (Array.isArray(object)) {
          if (!Number.isSafeInteger(key) || key < 0 || key >= object.length) fail('ARM array index is out of range.');
        } else if (!isObject(object) || typeof key !== 'string') {
          fail('ARM property access requires an object or an array.');
        }
        let actual = key;
        if (!own(object, key) && !Array.isArray(object)) actual = Object.keys(object).find(k => k.toLowerCase() === key.toLowerCase());
        if (actual === undefined || !own(object, actual)) fail('A requested ARM object property is unavailable; supply resolved network values or scope options.');
        let active = activeMembers.get(object);
        if (!active) { active = new Set(); activeMembers.set(object, active); }
        if (active.has(actual)) fail('Cyclic ARM object or variable reference. Remove the cycle before importing.');
        active.add(actual);
        try { return resolve(object[actual]); }
        finally { active.delete(actual); }
      }

      function named(kind, name) {
        if (typeof name !== 'string') fail('ARM parameter and variable selectors must be strings.');
        if (unsafeKeys.has(name.toLowerCase())) fail('Prototype-related ARM parameter or variable names are not supported.');
        const keyMap = kind === 'parameters' ? parameterKeys : variableKeys;
        const actual = keyMap.get(name.toLowerCase());
        if (actual === undefined) fail('Missing ARM ' + (kind === 'parameters' ? 'parameter ' : 'variable ') + safeSymbol(name) + '. Supply a nonsensitive default or export resolved network values.');
        const key = kind + ':' + actual.toLowerCase();
        if (activeNames.has(key)) fail('Cyclic ARM parameter or variable reference. Remove the cycle before importing.');
        if (valueCache.has(key)) return valueCache.get(key);
        activeNames.add(key);
        try {
          let value;
          if (kind === 'parameters') {
            const definition = parameters[actual];
            const type = ci(definition, 'type');
            if (typeof type === 'string' && /^secure(string|object)$/i.test(type)) {
              fail('Secure parameter ' + safeSymbol(actual) + ' is ignored. Export a resolved, nonsensitive name or network value.');
            }
            if (!isObject(definition) || !own(definition, 'defaultValue')) {
              fail('Missing default for ARM parameter ' + safeSymbol(actual) + '. Supply a nonsensitive default or export resolved network values.');
            }
            parameterDefaultsUsed = true;
            value = resolve(definition.defaultValue);
          } else value = resolve(variables[actual]);
          valueCache.set(key, value);
          return value;
        } finally { activeNames.delete(key); }
      }

      function scalar(value) {
        if (typeof value === 'string') return value;
        if (typeof value === 'number' && Number.isFinite(value)) return String(value);
        if (typeof value === 'boolean') return String(value);
        fail('ARM string conversion requires a scalar network value; object serialization is not supported.');
      }
      function arrayValues(value) {
        if (!Array.isArray(value)) fail('The requested ARM value must be an array.');
        if (value.length > MAX_RESOURCES) throw new ArmError('Requested ARM collection exceeds the 2,000-item safety limit.', true);
        return value.map((_, index) => member(value, index));
      }
      function combine(values) {
        const ids = values.filter(value => value instanceof ArmId);
        if (ids.length) {
          if (ids.length !== 1 || values[0] !== ids[0]) fail('Unsupported scoped resource ID composition.');
          const id = ids[0];
          const suffix = combine(values.slice(1));
          if (id.path.length + suffix.length > MAX_VALUE) throw new ArmError('ARM result exceeds the value size limit.', true);
          return new ArmId(id.path + suffix, id.group, id.subscription, id.level, id.local);
        }
        let length = 0;
        const strings = values.map(value => {
          const text = scalar(value);
          length += text.length;
          if (length > MAX_VALUE) throw new ArmError('ARM result exceeds the value size limit.', true);
          return text;
        });
        return strings.join('');
      }
      function makeResourceId(name, args) {
        const strings = args.map(scalar);
        const typeIndex = strings.findIndex(value => /^[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+\/[A-Za-z0-9_/-]+$/.test(value));
        const subscriptionLevel = name === 'subscriptionresourceid';
        if (typeIndex < 0 || typeIndex > (subscriptionLevel ? 1 : 2)) fail('Unsupported ARM resourceId scope or resource type.');
        const type = strings[typeIndex].split('/');
        const names = strings.slice(typeIndex + 1).join('/').split('/');
        // oxlint-disable-next-line no-control-regex -- Reject control characters in resource identity segments.
        if (type.length - 1 !== names.length || names.some(n => !n || /[\u0000-\u001f]/.test(n))) fail('ARM resourceId type and name segment counts do not match.');
        let path = '/providers/' + type[0];
        for (let i = 0; i < names.length; i++) path += '/' + type[i + 1] + '/' + names[i];
        const group = subscriptionLevel ? '' : typeIndex === 0 ? '' : strings[typeIndex - 1];
        const sub = subscriptionLevel ? (typeIndex === 1 ? strings[0] : subscription) : typeIndex === 2 ? strings[0] : subscription;
        return new ArmId(path, group, sub, subscriptionLevel ? 'subscription' : 'group', !subscriptionLevel && typeIndex === 0);
      }
      function evaluate(ast) {
        tick();
        if (++evalDepth > MAX_DEPTH) { evalDepth--; throw new ArmError('ARM evaluation depth exceeds 64.', true); }
        try {
          if (ast.kind === 'literal') return ast.value;
          if (ast.kind === 'member') return member(evaluate(ast.target), evaluate(ast.key));
          const name = ast.name;
          const arity = (min, max = min) => {
            if (ast.args.length < min || ast.args.length > max) fail('Unsupported ARM function argument count.');
          };
          if (name === 'if') {
            arity(3);
            const test = evaluate(ast.args[0]);
            if (typeof test !== 'boolean') fail('ARM if condition is not a known boolean.');
            return evaluate(ast.args[test ? 1 : 2]);
          }
          if (name === 'and' || name === 'or') {
            arity(2, MAX_TOKENS);
            for (const arg of ast.args) {
              const value = evaluate(arg);
              if (typeof value !== 'boolean') fail('ARM logical conditions must be booleans.');
              if (name === 'and' && !value) return false;
              if (name === 'or' && value) return true;
            }
            return name === 'and';
          }
          const supported = new Set(['parameters', 'variables', 'concat', 'resourceid', 'subscriptionresourceid', 'format',
            'tolower', 'toupper', 'replace', 'split', 'join', 'first', 'last', 'array', 'createarray', 'string', 'int', 'bool',
            'equals', 'not', 'resourcegroup', 'subscription']);
          if (!supported.has(name)) fail('Unsupported ARM function ' + safeSymbol(name) + '. Export resolved network values; runtime lookups and copy evaluation are not performed.');
          const args = ast.args.map(evaluate);
          switch (name) {
            case 'parameters': case 'variables': arity(1); return named(name, args[0]);
            case 'resourceid': case 'subscriptionresourceid': arity(2, 32); return makeResourceId(name, args);
            case 'concat':
              arity(1, MAX_TOKENS);
              if (Array.isArray(args[0])) {
                const result = [];
                for (const arg of args) {
                  const values = arrayValues(arg);
                  if (result.length + values.length > MAX_RESOURCES) throw new ArmError('ARM array result exceeds 2,000 items.', true);
                  result.push(...values);
                }
                return result;
              }
              return combine(args);
            case 'format': {
              arity(1, MAX_TOKENS);
              const pattern = scalar(args[0]);
              const parts = [];
              let at = 0;
              const tokens = /\{\{|\}\}|\{(\d+)\}|[{}]/g;
              let match;
              while ((match = tokens.exec(pattern))) {
                parts.push(pattern.slice(at, match.index));
                if (match[0] === '{{') parts.push('{');
                else if (match[0] === '}}') parts.push('}');
                else if (match[1] !== undefined && Number(match[1]) + 1 < args.length) parts.push(args[Number(match[1]) + 1]);
                else fail('Unsupported ARM format placeholder.');
                at = tokens.lastIndex;
              }
              parts.push(pattern.slice(at));
              return combine(parts.filter(part => part !== ''));
            }
            case 'tolower': case 'toupper': {
              arity(1);
              const transform = text => name === 'tolower' ? text.toLowerCase() : text.toUpperCase();
              const value = args[0];
              return value instanceof ArmId
                ? new ArmId(transform(value.path), transform(value.group), transform(value.subscription), value.level, value.local)
                : transform(scalar(value));
            }
            case 'replace': {
              arity(3);
              const find = scalar(args[1]);
              if (!find) fail('Empty ARM replace search strings are not supported.');
              return combine(scalar(args[0]).split(find).flatMap((part, i) => i ? [scalar(args[2]), part] : [part]));
            }
            case 'split': {
              arity(2);
              const result = scalar(args[0]).split(scalar(args[1]));
              if (result.length > MAX_RESOURCES) throw new ArmError('ARM split result exceeds 2,000 items.', true);
              return result;
            }
            case 'join': arity(2); return combine(arrayValues(args[0]).flatMap((part, i) => i ? [scalar(args[1]), scalar(part)] : [scalar(part)]));
            case 'first': case 'last': {
              arity(1);
              const value = args[0];
              if (typeof value !== 'string' && !Array.isArray(value)) fail('ARM first/last requires an array or string.');
              if (!value.length) fail('ARM first/last cannot select an empty value.');
              const index = name === 'first' ? 0 : value.length - 1;
              return typeof value === 'string' ? value[index] : member(value, index);
            }
            case 'array': arity(1); return Array.isArray(args[0]) ? args[0] : [args[0]];
            case 'createarray': return args;
            case 'string': arity(1); return args[0] instanceof ArmId ? args[0] : scalar(args[0]);
            case 'int': {
              arity(1);
              const text = scalar(args[0]);
              if (!/^-?\d+$/.test(text) || !Number.isSafeInteger(Number(text))) fail('ARM int requires a safe integer.');
              return Number(text);
            }
            case 'bool':
              arity(1);
              if (args[0] === true || args[0] === false) return args[0];
              if (typeof args[0] === 'number' && Number.isFinite(args[0])) return args[0] !== 0;
              if (typeof args[0] === 'string' && /^(true|false)$/i.test(args[0])) return args[0].toLowerCase() === 'true';
              fail('ARM bool value is not supported.');
              break;
            case 'equals':
              arity(2);
              if (args.some(a => a !== null && typeof a === 'object')) fail('ARM object equality is not supported.');
              return typeof args[0] === 'string' && typeof args[1] === 'string'
                ? args[0].toLowerCase() === args[1].toLowerCase() : args[0] === args[1];
            case 'not': arity(1); if (typeof args[0] !== 'boolean') fail('ARM not requires a boolean.'); return !args[0];
            case 'resourcegroup': {
              arity(0);
              fail('ARM resourceGroup() deployment metadata is unavailable. A display label is not scope evidence; export resolved network values.');
              break;
            }
            case 'subscription': {
              arity(0);
              const result = Object.create(null);
              if (subscription) { result.subscriptionId = subscription; result.id = '/subscriptions/' + subscription; }
              return result;
            }
          }
        } finally { evalDepth--; }
      }

      const context = record => record ? 'Resource ' + record.number + ' (' + record.type + ')' : 'Template';
      function optional(record, label, getValue) {
        try { return getValue(); }
        catch (error) {
          if (!(error instanceof ArmError) || error.fatal) throw error;
          warn(context(record) + ': ' + label + ' is unresolved. ' + error.message);
          return missing;
        }
      }
      function valueAt(object, path) {
        let value = resolve(object);
        for (const key of path.split('.')) {
          if (value === undefined || value === null) return undefined;
          if (!isObject(value)) fail('A requested ARM network property must be an object.');
          if (ci(value, 'copy') !== undefined) fail('ARM property copy loops are not expanded. Export resolved network properties.');
          const raw = ci(value, key);
          if (raw === undefined) return undefined;
          value = member(value, Object.keys(value).find(k => k.toLowerCase() === key.toLowerCase()));
        }
        return value;
      }
      const prop = (record, path) => optional(record, path, () => valueAt(ci(record.raw, 'properties') || {}, path));
      const configProp = (record, config, path) => optional(record, path, () => {
        const resolved = resolve(config);
        if (!isObject(resolved)) fail('IP configuration must be an object.');
        const nested = ci(resolved, 'properties');
        return valueAt(nested === undefined ? resolved : nested, path);
      });
      function list(record, label, value) {
        if (value === undefined || value === null || value === missing) return [];
        const result = optional(record, label, () => arrayValues(value));
        return result === missing ? [] : result;
      }
      function collection(value) {
        if (Array.isArray(value)) return value;
        if (isObject(value) && /^2(?:\.|$)/.test(String(ci(template, 'languageVersion') || ''))) return Object.values(value);
        fail('ARM resources must be an array, or a languageVersion 2.0 resources object with explicit type and name properties.');
      }
      function parseId(value) {
        let id;
        if (value instanceof ArmId) id = value;
        else {
          if (typeof value !== 'string' || value.length > MAX_VALUE || value.startsWith('[')) return null;
          const full = value.match(/^\/subscriptions\/([^/]+)(?:\/resourceGroups\/([^/]+))?(\/providers\/.+?)\/?$/i);
          if (!full) return null;
          id = new ArmId(full[3], full[2] || '', full[1], full[2] ? 'group' : 'subscription', false);
        }
        const parts = id.path.replace(/\/$/, '').split('/').slice(1);
        if (parts[0]?.toLowerCase() !== 'providers' || parts.length < 4 || parts.length % 2 !== 0 || parts.some(p => !p)) return null;
        const types = [parts[1]];
        const names = [];
        for (let i = 2; i < parts.length; i += 2) { types.push(parts[i]); names.push(parts[i + 1]); }
        if (types.slice(1).some(p => p.toLowerCase() === 'providers')) return null;
        return {
          type: types.join('/').toLowerCase(), name: names.join('/').toLowerCase(),
          group: id.group.toLowerCase(), subscription: id.subscription.toLowerCase(), level: id.level, local: id.local,
        };
      }
      const identity = (type, name) => type.toLowerCase() + '|' + name.toLowerCase();
      const exactKey = id => id.level + '|' + id.subscription + '|' + id.group + '|' + identity(id.type, id.name);
      const addIndex = (index, key, record) => {
        if (!index.has(key)) index.set(key, []);
        index.get(key).push(record);
      };
      function importantSnapshot(record) {
        const result = [];
        const comparable = value => {
          if (value instanceof ArmId) return parseId(value);
          if (value === missing) return '(unresolved)';
          if (value == null || ['string', 'boolean', 'number'].includes(typeof value)) return value;
          return '(unsupported network value)';
        };
        const paths = record.type === NETWORK + 'routetables/routes'
          ? ['addressPrefix', 'nextHopType', 'nextHopIpAddress']
          : record.type === NETWORK + 'virtualnetworks/subnets'
          ? ['networkSecurityGroup.id', 'routeTable.id', 'natGateway.id']
          : ['remoteVirtualNetwork.id', 'allowVirtualNetworkAccess', 'allowForwardedTraffic', 'allowGatewayTransit', 'useRemoteGateways'];
        if (record.type === NETWORK + 'virtualnetworks/subnets') {
          const single = prop(record, 'addressPrefix');
          const many = list(record, 'address prefixes', prop(record, 'addressPrefixes'));
          const addresses = [...(single === undefined ? [] : [single]), ...many]
            .map(value => typeof value === 'string' ? ipKey(value, true) || value : comparable(value));
          result.push(['addressPrefixes', [...new Set(addresses)].sort()]);
        }
        for (const path of paths) {
          const value = prop(record, path);
          result.push([path, comparable(value)]);
        }
        return JSON.stringify(result);
      }
      function gather(raw, parent, embedded, inheritedReason) {
        countResource();
        if (!embedded) resourceCount++;
        if (!isObject(raw)) fail('Every ARM resource declaration must be an object.');
        let type = ci(raw, 'type');
        if (typeof type !== 'string' || !/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(type)) fail('A resource has an unsupported or missing type. Export explicit ARM resource types.');
        if (!type.includes('.') && parent) type = parent.typeRaw + '/' + type;
        const typeRaw = type;
        type = type.toLowerCase();
        const record = { raw, type, typeRaw, number: allRecords.length + 1, embedded, parentRecord: parent, status: '', name: '', exact: null };
        allRecords.push(record);
        let reason = inheritedReason || '';
        if (ci(raw, 'copy') !== undefined) { reason = 'Skipped: copy loops are not expanded'; warn(context(record) + ': copy loop skipped; instances were not manufactured.'); }
        if (type === 'microsoft.resources/deployments') { reason = 'Skipped: linked or nested deployment scope'; warn(context(record) + ': nested/linked deployments are not evaluated. Import the separately exported target scope.'); }
        if (ci(raw, 'scope') !== undefined || ci(raw, 'subscriptionId') !== undefined || ci(raw, 'resourceGroup') !== undefined) {
          reason = 'Skipped: explicit deployment scope is not implemented';
          warn(context(record) + ': explicit resource scope is not implemented; no deployment is asserted.');
        }
        if (!reason && own(raw, 'condition')) {
          const condition = optional(record, 'condition', () => resolve(raw.condition));
          if (condition === false) reason = 'Skipped: condition is false';
          else if (condition !== true) { reason = 'Skipped: condition is unknown'; warn(context(record) + ': condition is not a known boolean; no deployment is asserted.'); }
        }
        if (reason) { record.status = 'skipped'; summarize(type, reason); }
        else {
          let name;
          try { name = boundedText(resolve(ci(raw, 'name')), 1024, 'Resource name'); }
          catch (error) {
            if (!(error instanceof ArmError)) throw error;
            throw new ArmError(context(record) + ': resource name could not be resolved. ' + error.message, error.fatal);
          }
          if (name.startsWith('[')) fail(context(record) + ': a resolved resource name still contains ARM expression syntax. Export an explicit nonsensitive name.');
          const segments = type.split('/').length - 1;
          if (parent) {
            const relativeSegments = segments - parent.type.split('/').length + 1;
            if (!type.startsWith(parent.type + '/') || !parent.name) fail(context(record) + ': unsupported nested resource parent/type relationship.');
            if (name.split('/').length === relativeSegments) name = parent.name + '/' + name;
            else if (!name.toLowerCase().startsWith(parent.name.toLowerCase() + '/')) fail(context(record) + ': child name does not match its declared parent.');
          }
          if (name.split('/').length !== segments || name.split('/').some(n => !n)) fail(context(record) + ': resource type/name segment counts do not match.');
          if (name.split('/').some(n => n.length > 256)) fail(context(record) + ': a resource name segment exceeds 256 characters.');
          record.name = name;
          record.key = identity(type, name);
          const explicitId = optional(record, 'id', () => resolve(ci(raw, 'id')));
          if (explicitId !== undefined && explicitId !== missing) {
            const parsed = parseId(explicitId);
            if (parsed && identity(parsed.type, parsed.name) === record.key) {
              if (!parsed.local && parsed.subscription) record.exact = parsed;
              // Only a literal, full source ID proves origin; evaluated expressions do not.
              if (typeof explicitId === 'string' && explicitId === ci(raw, 'id')
                && /^\/subscriptions\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/resourceGroups\/[^/]+\/providers\//i.test(explicitId)
                && /^[\p{L}\p{N}_.()-]{1,90}$/u.test(parsed.group) && !parsed.group.endsWith('.')
                && !/[\s\u0000-\u001f\u007f\\?#%\[\]<>]/.test(explicitId)
                && !explicitId.endsWith('/') && !explicitId.split('/').some(part => part === '.' || part === '..')) {
                record.sourceId = explicitId;
              }
            } else warn(context(record) + ': explicit ID is invalid or disagrees with type/name; it is not used to prove scope.');
          }
          records.push(record);
        }
        const children = ci(raw, 'resources');
        if (children !== undefined) for (const child of collection(children)) gather(child, record, false, reason);
        if (type === 'microsoft.resources/deployments') {
          // Count embedded deployment declarations for the bound, without executing their scope.
          const nested = ci(ci(ci(raw, 'properties'), 'template'), 'resources');
          if (nested !== undefined) for (const child of collection(nested)) gather(child, null, false, reason);
        }
        const embeddedTypes = type === NETWORK + 'virtualnetworks' ? ['subnets', 'virtualNetworkPeerings']
          : type === NETWORK + 'networksecuritygroups' ? ['securityRules'] : type === NETWORK + 'routetables' ? ['routes'] : [];
        for (const childType of embeddedTypes) {
          const childrenValue = reason ? ci(ci(raw, 'properties'), childType) : prop(record, childType);
          const childrenList = reason ? (Array.isArray(childrenValue) ? childrenValue : []) : list(record, childType, childrenValue);
          for (const child of childrenList) {
              if (!isObject(child)) fail(context(record) + ': embedded child resources must be objects.');
              gather({ type: childType, name: ci(child, 'name'), id: ci(child, 'id'), properties: ci(child, 'properties') || {} }, record, true, reason);
          }
        }
      }
      progress(25, 'resolve');
      const roots = collection(template.resources);
      for (let i = 0; i < roots.length; i++) {
        gather(roots[i], null, false, '');
        if (i % 32 === 0) progress(25 + Math.floor(20 * (i + 1) / Math.max(1, roots.length)), 'resolve');
      }

      const duplicates = new Map();
      for (const record of records) addIndex(duplicates, record.key, record);
      const blockedExplicitKeys = new Set();
      const uncertainExplicitTypes = new Set();
      const embeddedTypeSet = new Set(records.filter(r => r.embedded).map(r => r.type));
      for (const record of allRecords.filter(r => !r.embedded && r.status === 'skipped' && embeddedTypeSet.has(r.type))) {
        const name = optional(record, 'skipped declaration identity', () => resolve(ci(record.raw, 'name')));
        if (typeof name !== 'string' || name.startsWith('[')) {
          uncertainExplicitTypes.add(record.type);
          continue;
        }
        let fullName = name;
        if (record.parentRecord && name.split('/').length < record.type.split('/').length - 1) {
          if (!record.parentRecord.name) { uncertainExplicitTypes.add(record.type); continue; }
          fullName = record.parentRecord.name + '/' + name;
        }
        blockedExplicitKeys.add(identity(record.type, fullName));
      }
      const active = [];
      for (const entries of duplicates.values()) {
        const explicit = entries.filter(r => !r.embedded);
        const embedded = entries.filter(r => r.embedded);
        if (embedded.length) {
          if (!explicit.length && (blockedExplicitKeys.has(entries[0].key) || uncertainExplicitTypes.has(entries[0].type))) {
            for (const record of embedded) {
              record.status = 'skipped';
              summarize(record.type, 'Embedded definition suppressed by a skipped or unresolved explicit declaration');
            }
            warn(context(entries[0]) + ': embedded definition may be overridden by a skipped explicit declaration; no deployment was asserted.');
            continue;
          }
          const chosen = explicit.length ? explicit : [embedded[0]];
          for (const record of embedded) {
            if (chosen.includes(record)) continue;
            record.status = 'summarized';
            summarize(record.type, 'Embedded duplicate merged; explicit declaration wins');
            if ([NETWORK + 'virtualnetworks/subnets', NETWORK + 'virtualnetworks/virtualnetworkpeerings', NETWORK + 'routetables/routes'].includes(record.type)
              && (chosen.length !== 1 || importantSnapshot(record) !== importantSnapshot(chosen[0]))) {
              warn(context(record) + ': embedded and explicit network values disagree or are ambiguous; the explicit declaration wins.');
            }
          }
          active.push(...chosen);
        } else active.push(...explicit);
      }
      for (const record of active) {
        addIndex(indexes, record.key, record);
        if (record.exact) addIndex(exactIds, exactKey(record.exact), record);
      }
      for (const entries of indexes.values()) if (entries.length > 1) warn(context(entries[0]) + ': duplicate type/name declarations are ambiguous; unscoped references will not select an arbitrary resource.');

      function findParsed(record, parsed, label) {
        if (!parsed) { warn(context(record) + ': ' + label + ' is not a supported resource ID; no relationship was inferred.'); return null; }
        let candidates = [];
        if (!parsed.local && parsed.subscription) candidates = exactIds.get(exactKey(parsed)) || [];
        if (!candidates.length && parsed.local) candidates = indexes.get(identity(parsed.type, parsed.name)) || [];
        if (candidates.length !== 1) {
          warn(context(record) + ': ' + label + (candidates.length > 1 ? ' is ambiguous' : ' is external, absent, skipped, or its scope is unproved') + '; no relationship was inferred.');
          return null;
        }
        return candidates[0];
      }
      function reference(record, value, label, expected, owner = false) {
        if (value === undefined || value === null || value === missing) {
          warn(context(record) + ': ' + label + ' is missing or unresolved; no relationship was inferred.');
          return null;
        }
        const parsed = parseId(value);
        if (parsed && expected && !expected.includes(parsed.type)) {
          warn(context(record) + ': ' + label + ' has an unexpected resource type; no relationship was inferred.');
          return null;
        }
        if (parsed && owner) {
          parsed.type = parsed.type.slice(0, parsed.type.lastIndexOf('/'));
          parsed.name = parsed.name.slice(0, parsed.name.lastIndexOf('/'));
        }
        return findParsed(record, parsed, label);
      }
      function parentOf(record, expectedType) {
        const name = record.name.slice(0, record.name.lastIndexOf('/'));
        const parsed = record.exact ? { ...record.exact, type: expectedType, name: name.toLowerCase() }
          : { type: expectedType, name: name.toLowerCase(), local: true };
        return findParsed(record, parsed, 'parent resource');
      }
      const types = new Map(Object.entries({
        virtualnetworks: 'group-vnet', 'virtualnetworks/subnets': 'group-subnet',
        networksecuritygroups: 'nsg', routetables: 'udr', publicipaddresses: 'pip', publicipprefixes: 'pip-prefix',
        networkinterfaces: 'nic', applicationgateways: 'appgw', loadbalancers: 'lb', privateendpoints: 'private-endpoint',
        privatelinkservices: 'private-link-service', privatednszones: 'dns-zone', dnszones: 'dns-zone',
        dnsresolvers: 'dns-resolver', 'dnsresolvers/inboundendpoints': 'dns-resolver', 'dnsresolvers/outboundendpoints': 'dns-resolver',
        dnsforwardingrulesets: 'dns-resolver', azurefirewalls: 'firewall', firewallpolicies: 'firewall-policy',
        applicationgatewaywebapplicationfirewallpolicies: 'waf-policy', bastionhosts: 'bastion', natgateways: 'nat',
        virtualnetworkgateways: 'vpn-gw', expressroutecircuits: 'er-circuit', expressroutegateways: 'er-gw',
        localnetworkgateways: 'local-gw', virtualwans: 'vwan', virtualhubs: 'vwan-hub', applicationsecuritygroups: 'asg',
        networkwatchers: 'network-watcher', ddosprotectionplans: 'ddos-plan', ipgroups: 'ip-group',
      }).map(([type, slug]) => [NETWORK + type, slug]));
      for (const [type, slug] of Object.entries({
        'microsoft.compute/virtualmachines': 'vm', 'microsoft.compute/virtualmachinescalesets': 'vmss',
        'microsoft.storage/storageaccounts': 'storage', 'microsoft.containerservice/managedclusters': 'aks',
        'microsoft.web/sites': 'app-service', 'microsoft.containerinstance/containergroups': 'container-instance',
        'microsoft.containerregistry/registries': 'container-registry', 'microsoft.apimanagement/service': 'api-management',
        'microsoft.sql/servers': 'custom', 'microsoft.sql/servers/databases': 'sql-db',
        'microsoft.documentdb/databaseaccounts': 'cosmos', 'microsoft.keyvault/vaults': 'key-vault',
      })) types.set(type, slug);
      const typeLabels = new Map([
        [NETWORK + 'dnsresolvers/inboundendpoints', 'DNS inbound endpoint'],
        [NETWORK + 'dnsresolvers/outboundendpoints', 'DNS outbound endpoint'],
        [NETWORK + 'dnsforwardingrulesets', 'DNS forwarding ruleset'],
        ['microsoft.recoveryservices/vaults', 'Recovery Services vault'],
        ['microsoft.eventgrid/systemtopics', 'Event Grid system topic'],
        ['microsoft.sql/servers', 'SQL server'],
      ]);
      const associations = new Set([
        NETWORK + 'virtualnetworks/virtualnetworkpeerings',
        NETWORK + 'privatednszones/virtualnetworklinks', NETWORK + 'dnszones/virtualnetworklinks',
        NETWORK + 'dnsforwardingrulesets/virtualnetworklinks', NETWORK + 'privateendpoints/privatednszonegroups',
        NETWORK + 'connections',
      ]);
      const supportTypes = new Set([
        'networksecuritygroups', 'applicationsecuritygroups', 'routetables', 'firewallpolicies',
        'applicationgatewaywebapplicationfirewallpolicies', 'privatednszones', 'dnszones',
        'dnsforwardingrulesets', 'networkwatchers', 'ddosprotectionplans', 'ipgroups',
      ].map(type => NETWORK + type));
      const supportRootType = type => [...supportTypes].find(root => type === root || type.startsWith(root + '/'));
      const supportRoots = new Map();
      const supportChildren = new Map();
      for (const record of active) {
        const rootType = supportRootType(record.type);
        if (!rootType || associations.has(record.type)) continue;
        let root = record;
        if (rootType !== record.type) {
          const name = record.name.split('/').slice(0, rootType.split('/').length - 1).join('/').toLowerCase();
          root = findParsed(record, record.exact ? { ...record.exact, type: rootType, name }
            : { type: rootType, name, local: true }, 'support configuration parent');
          if (root) {
            if (!supportChildren.has(root)) supportChildren.set(root, []);
            supportChildren.get(root).push(record);
          }
        }
        supportRoots.set(record, root);
      }
      // An otherwise unrelated service is an endpoint only when a local, explicit Private Link reference proves it.
      const privateLinkTargets = new Map();
      const endpointTargets = new Set();
      for (const record of active.filter(r => r.type === NETWORK + 'privateendpoints')) {
        const targets = new Set();
        for (const path of ['privateLinkServiceConnections', 'manualPrivateLinkServiceConnections']) {
          for (const connection of list(record, path, prop(record, path))) {
            const target = reference(record, configProp(record, connection, 'privateLinkServiceId'), 'Private Link target');
            if (target) { targets.add(target); endpointTargets.add(target); }
          }
        }
        privateLinkTargets.set(record, targets);
      }
      const nicOwners = new Map();
      const nicsByVm = new Map();
      for (const record of active.filter(r => types.get(r.type) === 'vm')) {
        const nics = [];
        for (const item of list(record, 'network interfaces', prop(record, 'networkProfile.networkInterfaces'))) {
          const id = optional(record, 'network interface ID', () => valueAt(item, 'id'));
          const nic = reference(record, id, 'network interface', [NETWORK + 'networkinterfaces']);
          if (nic && !nics.includes(nic)) {
            nics.push(nic);
            if (!nicOwners.has(nic)) nicOwners.set(nic, new Set());
            nicOwners.get(nic).add(record);
          }
        }
        nicsByVm.set(record, nics);
      }
      const now = new Date().toISOString();
      // A Portal export omits its own scope, but any reference to a resource
      // outside the exported group is written as a literal ID, so the
      // subscription is frequently present in the file. It is read from the
      // text, never invented, and is used only for the display IDs below -
      // reference resolution and topology still use options.subscriptionId
      // alone, so a discovered value cannot change the diagram.
      const referenced = new Set();
      for (const match of rawString.matchAll(/\/subscriptions\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//gi)) {
        referenced.add(match[1].toLowerCase());
      }
      const discovered = referenced.size === 1 ? [...referenced][0] : '';
      if (subscription && discovered && discovered !== subscription.toLowerCase()) {
        warn('The supplied subscription ID differs from the one referenced in the template; the supplied value is used for resource IDs.');
      }
      if (!subscription && referenced.size > 1) {
        warn('The template references ' + referenced.size + ' subscriptions, so none is assumed. Resource IDs keep the {subscriptionId} placeholder.');
      }
      const scopeOrigin = subscription ? 'supplied' : discovered ? 'discovered' : 'unknown';
      // Display-only Azure resource IDs. The scope comes from what the operator
      // typed or from a literal reference in the file; it is never guessed, so
      // an unresolved scope stays a visible placeholder.
      const idScope = '/subscriptions/' + (subscription || discovered || '{subscriptionId}')
        + '/resourceGroups/' + (groupName || '{resourceGroupName}');
      const armPath = (record) => {
        const kinds = String(record.typeRaw || record.type).split('/');
        const names = String(record.name || '').split('/');
        const namespace = kinds.shift();
        if (!namespace || !namespace.includes('.') || !kinds.length || kinds.length !== names.length) return '';
        if (names.some((part) => !part)) return '';
        let path = '/providers/' + namespace;
        for (let index = 0; index < kinds.length; index++) path += '/' + kinds[index] + '/' + names[index];
        return path;
      };
      const rg = { id: 'arm-rg', type: 'group-rg', position: { x: 0, y: 0 }, data: { name: groupName || 'Imported resources', fields: {}, armId: idScope, armOrigin: 'derived', armScope: scopeOrigin } };
      nodeById.set(rg.id, rg);
      for (const record of active) {
        let slug = types.get(record.type);
        if (slug === 'nic' && nicOwners.get(record)?.size === 1) continue;
        if (associations.has(record.type)) continue;
        if (!slug && !endpointTargets.has(record) && record.type.split('/').length > 2) {
          if (supportRoots.has(record)) continue;
          record.status = 'summarized';
          summarize(record.type, 'Child configuration summarized; not a separate network node');
          continue;
        }
        if (!slug && !endpointTargets.has(record)) {
          record.status = 'summarized';
          summarize(record.type, 'Unrelated or unsupported service retained only in diagram Notes');
          continue;
        }
        if (!slug) { slug = 'custom'; summarize(record.type, 'Explicit Private Link target represented by a generic endpoint'); }
        if (record.type === NETWORK + 'virtualnetworkgateways') {
          const gatewayType = prop(record, 'gatewayType');
          if (typeof gatewayType === 'string' && gatewayType.toLowerCase() === 'expressroute') slug = 'er-gw';
          else if (typeof gatewayType !== 'string' || gatewayType.toLowerCase() !== 'vpn') typeLabels.set(record.type, 'VNet gateway');
        }
        const node = { id: 'arm-' + record.number, type: slug, parent: rg.id, position: { x: 0, y: 0 },
          data: { name: record.name.split('/').at(-1), fields: {} } };
        const typeLabel = typeLabels.get(record.type) || (slug === 'custom' ? record.type.split('/').at(-1).slice(0, 40) : '');
        if (typeLabel) node.data.typeLabel = typeLabel;
        if (record.sourceId) { node.data.armId = record.sourceId; node.data.armOrigin = 'template'; }
        else { const path = armPath(record); if (path) { node.data.armId = idScope + path; node.data.armOrigin = 'derived'; } }
        nodeByRecord.set(record, node);
        nodeById.set(node.id, node);
        if (record.sourceId) sourceByNode.set(node.id, record.sourceId);
        record.status = 'represented';
      }
      for (const [nic, owners] of nicOwners) {
        if (owners.size === 1) {
          nodeByRecord.set(nic, nodeByRecord.get([...owners][0]));
          nic.status = 'mapped';
          summarize(nic.type, 'NIC and IP configuration folded into its VM');
        } else warn(context(nic) + ': NIC is referenced by multiple VMs; details are attached to each explicit owner without asserting single-subnet placement.');
      }

      const vnetOfSubnet = new Map();
      const subnetSets = new Map();
      const declarationSubnets = new Map();
      const privateIPs = new Map();
      const publicIPs = new Map();
      const declarationAddresses = new Map();
      const pipConsumers = new Map();
      const attachmentRecords = new Map();
      const incompleteSubnet = new Set();
      const ownerComments = new Map();
      const supportOwners = new Map();
      const routeDetails = new Map();
      const usedRemoteGateways = new Set();
      const configurationDetails = new Map();
      let supportEntryCount = 0;
      const shortName = (name, length = 65) => name.length <= length ? name : name.slice(0, length - 20) + '...' + name.slice(-17);
      const ownerNodes = record => {
        const owners = nicOwners.get(record);
        return (owners?.size ? [...owners].map(owner => nodeByRecord.get(owner)) : [nodeByRecord.get(record)]).filter(Boolean);
      };
      function comment(owner, record, line, detail, priority = 20) {
        if (!owner) return;
        tick();
        if (!ownerComments.has(owner.id)) ownerComments.set(owner.id, new Map());
        const entries = ownerComments.get(owner.id);
        const key = record.number + '|' + detail;
        if (!entries.has(key)) {
          if (++supportEntryCount > MAX_SUPPORT_ENTRIES) throw new ArmError('Support annotation complexity exceeds the 12,000-entry limit. Export a smaller resource selection.', true);
          if (line.length > 100 || /[\r\n]/.test(line)) throw new ArmError('An annotation exceeded its safe display limit. Import stopped safely.', true);
          entries.set(key, { line, detail, priority });
        }
        if (!supportOwners.has(record)) supportOwners.set(record, new Set());
        supportOwners.get(record).add(owner.id);
      }
      function routeDetail(record) {
        if (routeDetails.has(record)) return routeDetails.get(record);
        const prefix = prop(record, 'addressPrefix');
        const hop = prop(record, 'nextHopType');
        const ip = prop(record, 'nextHopIpAddress');
        const tag = typeof prefix === 'string'
          && /^(Internet|VirtualNetwork|AzureCloud|AzureLoadBalancer|Storage|Sql|AzureActiveDirectory)(?:\.[a-z0-9-]{1,40})?$/i.test(prefix);
        const destination = ipKey(prefix, true) || tag ? prefix : 'unknown destination';
        const nextHop = ['VirtualAppliance', 'VirtualNetworkGateway', 'VnetLocal', 'Internet', 'None'].includes(hop) ? hop : 'unknown next hop';
        const nextIp = ipKey(ip) ? ip : '';
        if (destination === 'unknown destination') warn(context(record) + ': route destination is absent, unresolved, or unsupported; no effective route was inferred.');
        if (nextHop === 'unknown next hop' || (nextHop === 'VirtualAppliance' && !nextIp)) {
          warn(context(record) + ': configured route next hop is incomplete or unsupported; no effective route was inferred.');
        }
        if (ip !== undefined && ip !== missing && !nextIp) warn(context(record) + ': invalid route next-hop IP omitted.');
        if (nextIp && nextHop !== 'VirtualAppliance') {
          warn(context(record) + ': route next-hop IP is exported without VirtualAppliance; its forwarding role was not inferred.');
        }
        const detail = 'Route ' + record.name + ': destination ' + destination + '; next hop ' + nextHop
          + (nextIp ? (nextHop === 'VirtualAppliance' ? ' ' : '; exported nextHopIpAddress ') + nextIp : '')
          + '. Explicit configuration only; not an effective route.';
        const result = { line: 'UDR config: ' + destination + ' -> ' + (nextHop === 'VirtualAppliance' && nextIp ? nextIp : nextHop), detail,
          priority: prefix === '0.0.0.0/0' || prefix === '::/0' ? 0 : 5 };
        // A long service tag is not an IP/prefix; keep it complete in Notes rather than clipping a route.
        if (result.line.length > 100) result.line = 'UDR config: see complete destination/next hop in Notes';
        routeDetails.set(record, result);
        configurationDetails.set(record, detail);
        return result;
      }
      function support(record, target, label, via = '') {
        const children = supportChildren.get(target) || [];
        const childCounts = new Map();
        for (const child of children) {
          const type = child.type.slice(target.type.length + 1);
          childCounts.set(type, (childCounts.get(type) || 0) + 1);
        }
        const detail = label + ': ' + target.name + (via ? '; ' + via : '')
          + (children.length ? '; exported child configuration: ' + [...childCounts].map(([type, count]) => type + ' ' + count).join(', ') : '')
          + '. Configuration association only; no reachability or security-rule outcome is asserted.';
        const canvasLabel = label === 'WAF policy' && via.startsWith('HTTP listener') ? 'WAF (listener)'
          : label === 'WAF policy' && via.startsWith('URL path-rule') ? 'WAF (path)' : label;
        for (const owner of ownerNodes(record)) {
          comment(owner, target, canvasLabel + ': ' + shortName(target.name, 100 - canvasLabel.length - 2), detail,
            ['NSG', 'ASG', 'Firewall policy', 'WAF policy'].includes(label) ? 1 : 15);
          if (target.type === NETWORK + 'routetables') {
            for (const child of children.filter(r => r.type === NETWORK + 'routetables/routes')) {
              const route = routeDetail(child);
              comment(owner, child, route.line, route.detail, route.priority);
            }
          }
        }
      }
      function edge(source, target, kind, label, undirected = false) {
        if (!source || !target || source.id === target.id) return;
        const pair = undirected ? [source.id, target.id].sort() : [source.id, target.id];
        const key = kind + '|' + pair.join('|') + '|' + (label || '');
        if (edgeKeys.has(key)) return;
        edgeKeys.add(key);
        edges.push({ id: 'arm-edge-' + (edges.length + 1), source: pair[0], target: pair[1], kind, ...(label ? { label } : {}) });
      }
      function associated(record, path, label, expected, kind = 'link') {
        const value = prop(record, path);
        if (value === undefined) return;
        const target = reference(record, value, label, expected);
        if (target && supportTypes.has(target.type)) {
          support(record, target, label, record.type === NETWORK + 'networkinterfaces' ? 'via NIC ' + record.name : '');
        } else if (target) edge(nodeByRecord.get(record), nodeByRecord.get(target), kind, label);
      }
      function ipKey(value, cidr = false) {
        if (typeof value !== 'string' || value.length > 64) return null;
        const pieces = value.split('/');
        if (pieces.length !== (cidr ? 2 : 1)) return null;
        const address = pieces[0];
        let bits = 0;
        let key = '';
        if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(address) && address.split('.').every(n => Number(n) <= 255 && (n === '0' || !n.startsWith('0')))) {
          bits = 32; key = address;
        } else if (/^[0-9a-f:]+$/i.test(address) && address.includes(':') && !address.includes(':::')) {
          const halves = address.split('::');
          if (halves.length > 2) return null;
          const left = halves[0] ? halves[0].split(':') : [];
          const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
          if (![...left, ...right].every(n => /^[0-9a-f]{1,4}$/i.test(n))) return null;
          if (halves.length === 1 ? left.length !== 8 : left.length + right.length >= 8) return null;
          const parts = halves.length === 1 ? left : [...left, ...Array(8 - left.length - right.length).fill('0'), ...right];
          bits = 128; key = parts.map(n => parseInt(n, 16).toString(16)).join(':');
        } else return null;
        if (cidr && (!/^\d{1,3}$/.test(pieces[1]) || Number(pieces[1]) > bits)) return null;
        return key + (cidr ? '/' + Number(pieces[1]) : '');
      }
      function address(record, value, map, cidr = false) {
        if (value === missing || value === undefined || value === null || value === '') return;
        if (!ipKey(value, cidr)) { warn(context(record) + ': invalid or unresolved ' + (cidr ? 'CIDR' : 'IP address') + ' omitted; no address was manufactured.'); return; }
        if (!declarationAddresses.has(record)) declarationAddresses.set(record, new Set());
        declarationAddresses.get(record).add(value);
        const node = nodeByRecord.get(record);
        if (!node) return;
        if (!map.has(node.id)) map.set(node.id, []);
        const values = map.get(node.id);
        if (!values.some(v => ipKey(v, cidr) === ipKey(value, cidr))) values.push(value);
      }
      function attachSubnet(record, value) {
        const subnet = reference(record, value, 'subnet', [NETWORK + 'virtualnetworks/subnets']);
        const node = nodeByRecord.get(record);
        if (!node) return;
        if (!subnet || !nodeByRecord.has(subnet)) { incompleteSubnet.add(node.id); return; }
        if (!declarationSubnets.has(record)) declarationSubnets.set(record, new Set());
        declarationSubnets.get(record).add(subnet);
        if (!subnetSets.has(node.id)) subnetSets.set(node.id, new Set());
        subnetSets.get(node.id).add(subnet);
        if (!attachmentRecords.has(node.id)) attachmentRecords.set(node.id, record);
      }
      function attachPip(record, value) {
        const pip = reference(record, value, 'public IP', [NETWORK + 'publicipaddresses']);
        if (pip) {
          if (!pipConsumers.has(pip)) pipConsumers.set(pip, new Set());
          for (const node of ownerNodes(record)) pipConsumers.get(pip).add(node.id);
        }
      }
      function configurations(record, configs, requireSubnet = true) {
        for (const config of configs) {
          const subnet = configProp(record, config, 'subnet.id');
          if (requireSubnet || subnet !== undefined) attachSubnet(record, subnet);
          address(record, configProp(record, config, 'privateIPAddress'), privateIPs);
          const publicIp = configProp(record, config, 'publicIPAddress.id');
          if (publicIp !== undefined) attachPip(record, publicIp);
          if (record.type === NETWORK + 'networkinterfaces') {
            for (const membership of list(record, 'application security groups', configProp(record, config, 'applicationSecurityGroups'))) {
              const target = reference(record, optional(record, 'ASG ID', () => valueAt(membership, 'id')), 'ASG', [NETWORK + 'applicationsecuritygroups']);
              if (target) support(record, target, 'ASG', 'IP configuration membership on NIC ' + record.name);
            }
          }
          for (const [path, expected] of [
            ['applicationGatewayBackendAddressPools', NETWORK + 'applicationgateways/backendaddresspools'],
            ['loadBalancerBackendAddressPools', NETWORK + 'loadbalancers/backendaddresspools'],
          ]) {
            for (const pool of list(record, path, configProp(record, config, path))) {
              const id = optional(record, path, () => valueAt(pool, 'id'));
              const gateway = reference(record, id, 'backend pool', [expected], true);
              if (gateway) for (const owner of ownerNodes(record)) edge(nodeByRecord.get(gateway), owner, 'backend', 'Backend');
            }
          }
        }
      }

      progress(50, 'topology');
      for (const record of active.filter(r => r.type === NETWORK + 'virtualnetworks/subnets')) {
        const parent = parentOf(record, NETWORK + 'virtualnetworks');
        if (parent && nodeByRecord.has(parent)) {
          nodeByRecord.get(record).parent = nodeByRecord.get(parent).id;
          vnetOfSubnet.set(record, parent);
        }
      }
      const cidrs = new Map();
      for (const record of active) {
        const node = nodeByRecord.get(record);
        if (!node) continue;
        const type = record.type;
        if (type === NETWORK + 'virtualnetworks' || type === NETWORK + 'virtualnetworks/subnets') {
          const prefixes = type === NETWORK + 'virtualnetworks' ? prop(record, 'addressSpace.addressPrefixes') : prop(record, 'addressPrefixes');
          for (const value of list(record, 'address prefixes', prefixes)) address(record, value, cidrs, true);
          if (type === NETWORK + 'virtualnetworks') associated(record, 'ddosProtectionPlan.id', 'DDoS plan', [NETWORK + 'ddosprotectionplans']);
          if (type.endsWith('/subnets')) {
            address(record, prop(record, 'addressPrefix'), cidrs, true);
            associated(record, 'networkSecurityGroup.id', 'NSG', [NETWORK + 'networksecuritygroups']);
            associated(record, 'routeTable.id', 'Route table', [NETWORK + 'routetables']);
            associated(record, 'natGateway.id', 'NAT', [NETWORK + 'natgateways']);
          }
        } else if (type === NETWORK + 'networkinterfaces') {
          const configs = list(record, 'IP configurations', prop(record, 'ipConfigurations'));
          if (!configs.length) {
            incompleteSubnet.add(node.id);
            warn(context(record) + ': no NIC IP configuration was exported; subnet and private IP are unknown.');
          }
          configurations(record, configs);
          associated(record, 'networkSecurityGroup.id', 'NSG', [NETWORK + 'networksecuritygroups']);
        } else if (type === NETWORK + 'applicationgateways') {
          const gateways = list(record, 'gateway IP configurations', prop(record, 'gatewayIPConfigurations'));
          if (!gateways.length) { incompleteSubnet.add(node.id); warn(context(record) + ': gateway subnet was not exported.'); }
          configurations(record, gateways);
          configurations(record, list(record, 'frontend IP configurations', prop(record, 'frontendIPConfigurations')), false);
          associated(record, 'firewallPolicy.id', 'WAF policy', [NETWORK + 'applicationgatewaywebapplicationfirewallpolicies']);
          for (const listener of list(record, 'HTTP listeners', prop(record, 'httpListeners'))) {
            const policyId = configProp(record, listener, 'firewallPolicy.id');
            if (policyId !== undefined) {
              const target = reference(record, policyId, 'listener WAF policy', [NETWORK + 'applicationgatewaywebapplicationfirewallpolicies']);
              if (target) support(record, target, 'WAF policy', 'HTTP listener scope, not the entire gateway');
            }
          }
          for (const map of list(record, 'URL path maps', prop(record, 'urlPathMaps'))) {
            for (const rule of list(record, 'path rules', configProp(record, map, 'pathRules'))) {
              const policyId = configProp(record, rule, 'firewallPolicy.id');
              if (policyId !== undefined) {
                const target = reference(record, policyId, 'path WAF policy', [NETWORK + 'applicationgatewaywebapplicationfirewallpolicies']);
                if (target) support(record, target, 'WAF policy', 'URL path-rule scope, not the entire gateway');
              }
            }
          }
        } else if (type === NETWORK + 'privateendpoints') {
          attachSubnet(record, prop(record, 'subnet.id'));
          configurations(record, list(record, 'IP configurations', prop(record, 'ipConfigurations')), false);
          for (const config of list(record, 'custom DNS configuration', prop(record, 'customDnsConfigs'))) {
            const ips = optional(record, 'custom DNS IP addresses', () => valueAt(config, 'ipAddresses'));
            for (const ip of list(record, 'custom DNS IP addresses', ips)) address(record, ip, privateIPs);
          }
          for (const target of privateLinkTargets.get(record) || []) {
              if (target && nodeByRecord.has(target) && !['pip', 'nic', 'vm', 'nsg', 'udr'].includes(nodeByRecord.get(target).type)
                && !nodeByRecord.get(target).type.startsWith('group-')) edge(node, nodeByRecord.get(target), 'privateendpoint', 'Private Link');
              else if (target) warn(context(record) + ': Private Link target is summarized; no target node was manufactured.');
          }
        } else if (type === NETWORK + 'dnsresolvers') {
          const vnet = reference(record, prop(record, 'virtualNetwork.id'), 'resolver VNet', [NETWORK + 'virtualnetworks']);
          if (vnet) node.parent = nodeByRecord.get(vnet).id;
        } else if (type === NETWORK + 'dnsresolvers/inboundendpoints' || type === NETWORK + 'dnsresolvers/outboundendpoints') {
          const resolver = parentOf(record, NETWORK + 'dnsresolvers');
          if (resolver) edge(nodeByRecord.get(resolver), node, 'dns', type.endsWith('/inboundendpoints') ? 'Inbound' : 'Outbound');
          const directSubnet = prop(record, 'subnet.id');
          const configs = list(record, 'IP configurations', prop(record, 'ipConfigurations'));
          if (directSubnet !== undefined) attachSubnet(record, directSubnet);
          configurations(record, configs);
          if (!configs.length && directSubnet === undefined) warn(context(record) + ': DNS endpoint subnet was not exported.');
        } else if (type === NETWORK + 'dnsforwardingrulesets') {
          for (const endpoint of list(record, 'outbound endpoints', prop(record, 'dnsResolverOutboundEndpoints'))) {
            const target = reference(record, optional(record, 'outbound endpoint ID', () => valueAt(endpoint, 'id')), 'DNS outbound endpoint', [NETWORK + 'dnsresolvers/outboundendpoints']);
            if (target) support(target, record, 'DNS forwarding ruleset');
          }
        } else if (['firewall', 'bastion', 'vpn-gw', 'er-gw', 'private-link-service'].includes(node.type)) {
          configurations(record, list(record, 'IP configurations', prop(record, 'ipConfigurations')));
          associated(record, 'firewallPolicy.id', 'Firewall policy', [NETWORK + 'firewallpolicies']);
          associated(record, 'virtualHub.id', 'Virtual hub', [NETWORK + 'virtualhubs']);
        } else if (node.type === 'lb') {
          configurations(record, list(record, 'frontend IP configurations', prop(record, 'frontendIPConfigurations')), false);
        } else if (node.type === 'nat') {
          for (const pip of list(record, 'public IP addresses', prop(record, 'publicIpAddresses'))) {
            attachPip(record, optional(record, 'public IP ID', () => valueAt(pip, 'id')));
          }
          for (const prefix of list(record, 'public IP prefixes', prop(record, 'publicIpPrefixes'))) {
            const target = reference(record, optional(record, 'public IP prefix ID', () => valueAt(prefix, 'id')), 'public IP prefix', [NETWORK + 'publicipprefixes']);
            if (target) {
              const cidr = prop(target, 'ipPrefix');
              address(target, cidr, cidrs, true);
              comment(node, target, 'IP prefix: ' + shortName(target.name), 'Public IP prefix: ' + target.name
                + '; exported CIDR: ' + (ipKey(cidr, true) ? cidr : 'unknown') + '.', 30);
            }
          }
        } else if (node.type === 'pip') address(record, prop(record, 'ipAddress'), publicIPs);
        else if (node.type === 'pip-prefix') address(record, prop(record, 'ipPrefix'), cidrs, true);
        else if (node.type === 'local-gw') {
          address(record, prop(record, 'gatewayIpAddress'), publicIPs);
          for (const prefix of list(record, 'remote gateway address prefixes', prop(record, 'localNetworkAddressSpace.addressPrefixes'))) {
            address(record, prefix, cidrs, true);
          }
        }
      }
      for (const [vm, nics] of nicsByVm) {
        const node = nodeByRecord.get(vm);
        if (!nics.length) warn(context(vm) + ': no locally resolved NIC; VM placement and private IP are unknown.');
        // A shared NIC is not folded, and an unresolved extra NIC must not imply single-subnet containment.
        const declarations = list(vm, 'network interfaces', prop(vm, 'networkProfile.networkInterfaces'));
        if (declarations.length !== nics.length || nics.some(nic => nicOwners.get(nic)?.size !== 1)) incompleteSubnet.add(node.id);
      }
      for (const [nodeId, subnets] of subnetSets) {
        const node = nodeById.get(nodeId);
        const entries = [...subnets];
        const vnets = new Set(entries.map(subnet => vnetOfSubnet.get(subnet)));
        if (!incompleteSubnet.has(nodeId) && entries.length === 1) node.parent = nodeByRecord.get(entries[0]).id;
        else {
          if (!incompleteSubnet.has(nodeId) && vnets.size === 1 && !vnets.has(undefined)) node.parent = nodeByRecord.get([...vnets][0]).id;
          warn(context(attachmentRecords.get(nodeId)) + ': multiple or unresolved subnet attachments; no single-subnet placement was asserted.');
          for (const subnet of subnets) edge(node, nodeByRecord.get(subnet), 'link', 'Subnet');
        }
      }
      for (const record of active.filter(r => r.type === NETWORK + 'dnsresolvers/inboundendpoints' || r.type === NETWORK + 'dnsresolvers/outboundendpoints')) {
        const resolver = parentOf(record, NETWORK + 'dnsresolvers');
        const endpointNode = nodeByRecord.get(record);
        const resolverNode = nodeByRecord.get(resolver);
        if (!resolverNode) continue;
        const resolverVnet = nodeVnet(resolverNode);
        const endpointVnet = nodeVnet(endpointNode);
        if (resolverVnet && endpointVnet && resolverVnet !== endpointVnet) {
          warn(context(record) + ': endpoint subnet disagrees with the resolver VNet; the exported subnet is shown without asserting a valid deployment.');
        } else if (resolverVnet && !endpointVnet && !subnetSets.has(endpointNode.id)) {
          endpointNode.parent = resolverVnet;
        }
      }
      for (const [nic, owners] of nicOwners) {
        const nicNode = nodeByRecord.get(nic);
        for (const owner of owners) {
          const vmNode = nodeByRecord.get(owner);
          if (owners.size > 1) {
            for (const ip of privateIPs.get(nicNode.id) || []) {
              if (!privateIPs.has(vmNode.id)) privateIPs.set(vmNode.id, []);
              if (!privateIPs.get(vmNode.id).includes(ip)) privateIPs.get(vmNode.id).push(ip);
            }
          }
          comment(vmNode, nic, 'NIC: ' + shortName(nic.name), 'NIC: ' + nic.name
            + (owners.size > 1 ? '; shared by multiple explicit VM references; no single-subnet placement asserted.' : '; explicitly attached to this VM.'), 40);
        }
        if (owners.size > 1) {
          nic.status = 'mapped';
          summarize(nic.type, 'Shared NIC details attached to each explicit VM owner; no NIC card');
        }
      }
      for (const [pip, consumers] of pipConsumers) {
        const pipNode = nodeByRecord.get(pip);
        if (!pipNode) continue;
        for (const consumer of consumers) {
          const owner = nodeById.get(consumer);
          for (const ip of publicIPs.get(pipNode.id) || []) {
            if (!publicIPs.has(owner.id)) publicIPs.set(owner.id, []);
            if (!publicIPs.get(owner.id).includes(ip)) publicIPs.get(owner.id).push(ip);
          }
          comment(owner, pip, 'Public IP: ' + shortName(pip.name), 'Public IP resource: ' + pip.name
            + '; exported address: ' + (publicIPs.get(pipNode.id)?.join(', ') || 'unknown')
            + (consumers.size > 1 ? '; referenced by multiple explicit endpoints; validity is not asserted.' : '.'), 30);
        }
        if (consumers.size > 1) warn(context(pip) + ': public IP has multiple explicit consumers; each receives the exported details without a separate address card.');
      }
      progress(70, 'topology');
      for (const record of active.filter(r => associations.has(r.type))) {
        if (record.type === NETWORK + 'virtualnetworks/virtualnetworkpeerings') {
          const source = parentOf(record, NETWORK + 'virtualnetworks');
          const target = reference(record, prop(record, 'remoteVirtualNetwork.id'), 'remote peering VNet', [NETWORK + 'virtualnetworks']);
          if (source && target) edge(nodeByRecord.get(source), nodeByRecord.get(target), 'peering', 'Peering', true);
          record.status = source && target ? 'mapped' : 'summarized';
          summarize(record.type, source && target ? 'Mapped to exported peering association; reciprocal pair deduplicated'
            : 'Unresolved peering configuration retained only in diagram Notes');
        } else if (record.type.endsWith('/virtualnetworklinks')) {
          const sourceType = record.type.slice(0, record.type.lastIndexOf('/'));
          const source = parentOf(record, sourceType);
          const target = reference(record, prop(record, 'virtualNetwork.id'), 'DNS VNet link', [NETWORK + 'virtualnetworks']);
          if (source && target) {
            support(target, source, sourceType === NETWORK + 'dnsforwardingrulesets'
              ? 'DNS forwarding ruleset' : sourceType === NETWORK + 'privatednszones' ? 'Private DNS zone' : 'DNS zone');
            supportOwners.set(record, new Set(ownerNodes(target).map(owner => owner.id)));
          }
          record.status = source && target ? 'annotated' : 'summarized';
          summarize(record.type, source && target ? 'DNS VNet link represented by owner comments and Notes'
            : 'Unresolved DNS VNet link retained only in diagram Notes');
        } else if (record.type.endsWith('/privatednszonegroups')) {
          const source = parentOf(record, NETWORK + 'privateendpoints');
          let annotated = false;
          for (const config of list(record, 'private DNS zone configurations', prop(record, 'privateDnsZoneConfigs'))) {
            const target = reference(record, configProp(record, config, 'privateDnsZoneId'), 'private DNS zone', [NETWORK + 'privatednszones']);
            if (source && target) {
              support(source, target, 'Private DNS zone');
              supportOwners.set(record, new Set(ownerNodes(source).map(owner => owner.id)));
              annotated = true;
            }
          }
          record.status = annotated ? 'annotated' : 'summarized';
          summarize(record.type, annotated ? 'Private endpoint DNS zone association represented by owner comments and Notes'
            : 'Unresolved private DNS zone group retained only in diagram Notes');
        } else if (record.type === NETWORK + 'connections') {
          const first = reference(record, prop(record, 'virtualNetworkGateway1.id'), 'connection gateway', [NETWORK + 'virtualnetworkgateways']);
          const secondId = prop(record, 'virtualNetworkGateway2.id') ?? prop(record, 'localNetworkGateway2.id') ?? prop(record, 'peer.id');
          const second = reference(record, secondId, 'connection peer', [NETWORK + 'virtualnetworkgateways', NETWORK + 'localnetworkgateways', NETWORK + 'expressroutecircuits']);
          const connectionType = prop(record, 'connectionType');
          const kind = connectionType === 'ExpressRoute' ? 'expressroute' : ['IPsec', 'Vnet2Vnet'].includes(connectionType) ? 'vpn' : 'link';
          const mapped = first && second && nodeByRecord.has(first) && nodeByRecord.has(second);
          if (mapped) {
            const label = kind === 'expressroute' ? 'ExpressRoute' : kind === 'vpn' ? 'VPN' : 'Connection';
            edge(nodeByRecord.get(first), nodeByRecord.get(second), kind, label + ': ' + shortName(record.name));
            if (second.type === NETWORK + 'localnetworkgateways') {
              usedRemoteGateways.add(second);
              nodeByRecord.get(second).data.typeLabel = 'Remote VPN endpoint';
            }
            const bgp = prop(record, 'enableBgp');
            const detail = 'Tunnel ' + record.name + ': ' + first.name + ' -> ' + second.name
              + '; type ' + (['ExpressRoute', 'IPsec', 'Vnet2Vnet', 'VPNClient'].includes(connectionType) ? connectionType : 'unknown')
              + (typeof bgp === 'boolean' ? '; BGP explicitly ' + (bgp ? 'enabled' : 'disabled') : '')
              + '. Declared connection; tunnel status and packet path are unverified.';
            configurationDetails.set(record, detail);
            for (const endpoint of [first, second]) comment(nodeByRecord.get(endpoint), record, label + ': ' + shortName(record.name), detail, 40);
          }
          record.status = mapped ? 'mapped' : 'summarized';
          summarize(record.type, mapped ? 'Mapped to explicitly exported gateway connection'
            : 'Unresolved gateway connection retained only in diagram Notes');
        }
      }

      function nodeVnet(node) {
        const seen = new Set();
        while (node && !seen.has(node.id)) {
          if (node.type === 'group-vnet') return node.id;
          seen.add(node.id);
          node = nodeById.get(node.parent);
        }
        return null;
      }
      const ipIndex = new Map();
      for (const [nodeId, ips] of privateIPs) {
        const node = nodeById.get(nodeId);
        // Hidden NIC declarations can disprove uniqueness, but can never become inferred workload targets.
        if (!node || !['vm', 'private-endpoint', 'nic'].includes(node.type)) continue;
        const vnet = nodeVnet(node);
        if (!vnet) continue;
        for (const ip of ips) {
          const key = vnet + '|' + ipKey(ip);
          if (!ipIndex.has(key)) ipIndex.set(key, new Set());
          ipIndex.get(key).add(nodeId);
        }
      }
      for (const candidates of ipIndex.values()) if (candidates.size > 1) warn('Duplicate private IPs within a declared VNet are ambiguous; IP-only backend associations will not choose an arbitrary endpoint.');
      for (const record of active.filter(r => ['appgw', 'lb'].includes(types.get(r.type)))) {
        const source = nodeByRecord.get(record);
        for (const pool of list(record, 'backend pools', prop(record, 'backendAddressPools'))) {
          const gatewayAddresses = list(record, 'backend addresses', configProp(record, pool, 'backendAddresses'));
          const lbAddresses = list(record, 'load balancer backend addresses', configProp(record, pool, 'loadBalancerBackendAddresses'));
          for (const backend of [...gatewayAddresses, ...lbAddresses]) {
            const ip = configProp(record, backend, 'ipAddress');
            if (ip === undefined) {
              warn(context(record) + ': non-IP backend address is not resolved locally; no backend relationship was inferred.');
              continue;
            }
            if (!ipKey(ip)) { warn(context(record) + ': backend IP is invalid or unresolved; no backend relationship was inferred.'); continue; }
            let vnet = nodeVnet(source);
            const explicitVnet = configProp(record, backend, 'virtualNetwork.id');
            if (explicitVnet !== undefined) {
              const targetVnet = reference(record, explicitVnet, 'backend VNet', [NETWORK + 'virtualnetworks']);
              vnet = targetVnet ? nodeByRecord.get(targetVnet).id : null;
            }
            const candidates = vnet ? ipIndex.get(vnet + '|' + ipKey(ip)) : null;
            const target = candidates?.size === 1 ? nodeById.get([...candidates][0]) : null;
            if (target && ['vm', 'private-endpoint'].includes(target.type)) edge(source, target, 'backend', 'Backend');
            else warn(context(record) + ': backend IP has no unique endpoint in its declared VNet; no cross-VNet IP match was inferred.');
          }
        }
      }

      for (const record of active.filter(r => r.type === NETWORK + 'routetables/routes')) routeDetail(record);
      for (const record of active.filter(r => r.type === NETWORK + 'dnsforwardingrulesets/forwardingrules')) {
        const domain = prop(record, 'domainName');
        const safeDomain = typeof domain === 'string' && domain.length <= 254
          && /^(?:\*\.)?[a-z0-9_.-]+\.?$/i.test(domain) ? domain : 'unknown domain';
        if (safeDomain === 'unknown domain') warn(context(record) + ': forwarding domain is absent, unresolved, or unsupported; no DNS behavior was inferred.');
        const servers = [];
        for (const server of list(record, 'target DNS servers', prop(record, 'targetDnsServers'))) {
          const ip = configProp(record, server, 'ipAddress');
          const port = configProp(record, server, 'port');
          if (ipKey(ip) && Number.isInteger(port) && port > 0 && port <= 65535) servers.push(ip + ' port ' + port);
          else warn(context(record) + ': incomplete or invalid DNS forwarding target omitted.');
        }
        const detail = 'DNS forwarding rule ' + record.name + ': domain ' + safeDomain
          + '; exported targets: ' + (servers.join(', ') || 'unknown') + '. Forwarding behavior is not verified.';
        configurationDetails.set(record, detail);
        const root = supportRoots.get(record);
        for (const ownerId of supportOwners.get(root) || []) {
          comment(nodeById.get(ownerId), record, 'DNS forwarding rule: ' + shortName(record.name), detail, 25);
        }
      }
      // Final owner accounting must exclude configuration-only NICs and other cards removed here.
      const originalNodes = new Map(nodeById);
      for (const record of supportRoots.keys()) {
        const node = nodeByRecord.get(record);
        if (node) nodeById.delete(node.id);
      }
      const foldedRecords = [];
      for (const record of active) {
        const slug = types.get(record.type);
        if (!['nic', 'pip', 'pip-prefix', 'local-gw'].includes(slug)) continue;
        if (slug === 'local-gw' && usedRemoteGateways.has(record)) continue;
        const node = nodeByRecord.get(record);
        if (!node) continue;
        if (!configurationDetails.has(record)) {
          const values = [...(declarationAddresses.get(record) || [])];
          const subnets = [...(declarationSubnets.get(record) || [])].map(subnet => subnet.name);
          configurationDetails.set(record, record.type + ' ' + record.name + ': exported addresses '
            + (values.join(', ') || 'unknown') + (subnets.length ? '; declared subnet attachments: ' + subnets.join(', ') : '') + '.');
        }
        if (node.type === slug) nodeById.delete(node.id);
        foldedRecords.push(record);
      }
      for (const [record, root] of supportRoots) {
        const owners = new Set([...(supportOwners.get(record) || []), ...(supportOwners.get(root) || [])].filter(id => nodeById.has(id)));
        supportOwners.set(record, owners);
        record.status = owners.size ? 'annotated' : 'summarized';
        summarize(record.type, owners.size ? 'Supporting configuration represented by attached owner comments and diagram Notes'
          : 'Unattached or unresolved supporting configuration retained only in diagram Notes');
      }
      for (const record of foldedRecords) {
        const owners = new Set([...(supportOwners.get(record) || [])].filter(id => nodeById.has(id)));
        supportOwners.set(record, owners);
        if (record.status !== 'mapped') {
          const attached = owners.size;
          record.status = attached ? 'mapped' : 'summarized';
          summarize(record.type, attached ? 'Address/interface configuration represented by attached owner details'
            : 'Unattached interface/address or unreferenced remote gateway configuration retained only in diagram Notes');
        }
      }
      const keptEdges = edges.filter(e => nodeById.has(e.source) && nodeById.has(e.target));
      edges.length = 0;
      for (const kept of keptEdges) edges.push(kept);
      if (nodeById.size > MAX_RENDERED_NODES) {
        throw new ArmError('Diagram exceeds the 300-rendered-node limit, including groups. Export a smaller resource selection before importing.', true);
      }
      const ownerDetails = [];
      for (const node of nodeById.values()) {
        const entries = [...(ownerComments.get(node.id)?.values() || [])].sort((a, b) => a.priority - b.priority);
        if (!entries.length) continue;
        const lines = [...new Set(entries.map(entry => entry.line))];
        node.data.notes = (lines.length <= 3 ? lines : [...lines.slice(0, 2), '+' + (lines.length - 2) + ' more in Notes']).join('\n');
        ownerDetails.push('Owner ' + node.data.name + ' (' + node.type + ', ' + node.id + '):');
        for (const entry of entries) ownerDetails.push(entry.detail);
      }
      const hiddenOwnerDetails = [];
      for (const [ownerId, entries] of ownerComments) {
        if (nodeById.has(ownerId)) continue;
        const owner = originalNodes.get(ownerId);
        if (!owner) throw new ArmError('An invalid configuration owner was found. Import stopped safely.', true);
        hiddenOwnerDetails.push('Owner ' + owner.data.name + ' (' + owner.type + ', ' + owner.id + ') - not drawn:');
        for (const entry of entries.values()) hiddenOwnerDetails.push(entry.detail);
      }
      for (const node of nodeById.values()) {
        const values = [];
        for (const ip of privateIPs.get(node.id) || []) values.push(['privateIp', ip]);
        for (const ip of publicIPs.get(node.id) || []) values.push(['publicIp', ip]);
        for (const cidr of cidrs.get(node.id) || []) values.push(['cidr', cidr]);
        // Keep both public/private addressing visible when present; extra addresses stay off canvas.
        const selected = [];
        for (const key of ['privateIp', 'publicIp', 'cidr']) {
          const first = values.find(([kind]) => kind === key);
          if (first && selected.length < 2) selected.push(first);
        }
        for (const value of values) if (selected.length < 2 && !selected.includes(value)) selected.push(value);
        for (const [key, value] of selected) node.data.fields[own(node.data.fields, key) ? key + '2' : key] = value;
        if (values.length > selected.length) {
          const extra = values.filter(value => !selected.includes(value));
          notesDetails.push('Node ' + node.id + ': additional exported addresses omitted from the card: '
            + extra.map(([kind, value]) => kind + ' ' + value).join('; ') + '.');
        }
        if (['vm', 'nic', 'private-endpoint', 'appgw', 'pip'].includes(node.type) && !values.length) {
          warn('Node ' + node.id + ': no IP address was exported; addressing is unknown.');
        }
      }
      for (const record of allRecords) if (!record.status) {
        record.status = 'summarized';
        summarize(record.type, 'Resource configuration not represented separately');
      }
      const ordered = [];
      const visiting = new Set();
      const visited = new Set();
      function emit(node) {
        if (visited.has(node.id)) return;
        if (visiting.has(node.id)) throw new ArmError('A cyclic containment relationship was found. Import stopped safely.', true);
        visiting.add(node.id);
        if (node.parent) {
          const parent = nodeById.get(node.parent);
          if (!parent || !parent.type.startsWith('group-')) throw new ArmError('Invalid resource containment. Import stopped safely.', true);
          emit(parent);
        }
        visiting.delete(node.id);
        visited.add(node.id);
        ordered.push(node);
      }
      for (const node of nodeById.values()) emit(node);
      // Resources the layout summarizes instead of drawing - an unattached NSG,
      // a NIC folded into its VM - are still declared in the template. Their IDs
      // ride along on whichever node absorbed them, so selecting a container
      // lists everything the export declared inside it, not only what is drawn.
      // Embedded child configuration (NSG rules, routes, peerings) is excluded:
      // it is detail of its parent, not a resource a reader is looking for.
      const extras = new Map();
      for (const record of allRecords) {
        const own = nodeByRecord.get(record);
        // A node object can survive in nodeByRecord after support-node removal
        // or folding, so presence in nodeById is what proves it is still drawn.
        if (own && own.id === 'arm-' + record.number && nodeById.has(own.id)) continue;
        if (record.embedded) continue;
        const path = armPath(record);
        const resourceId = record.sourceId || (path ? idScope + path : '');
        if (!resourceId) continue;
        const owners = new Set(supportOwners.get(record) || []);
        if (own) owners.add(own.id);
        for (const node of ownerNodes(record)) owners.add(node.id);
        const hosts = [...owners].filter(id => nodeById.has(id));
        if (!hosts.length) hosts.push(rg.id);
        const entry = { t: record.typeRaw || record.type, i: resourceId,
          o: record.sourceId ? 'template' : 'derived' };
        for (const hostId of hosts) {
          if (!extras.has(hostId)) extras.set(hostId, new Map());
          extras.get(hostId).set(resourceId, entry);
        }
      }
      for (const [hostId, list] of extras) {
        const host = nodeById.get(hostId);
        if (host) host.data.armExtra = JSON.stringify([...list.values()]);
      }
      const diagram = { version: 1, meta: { title, createdUtc: now, updatedUtc: now }, nodes: ordered, edges, annotations: [] };
      const report = { resourceCount, nodeCount: ordered.length, edgeCount: edges.length,
        summarized: [...summaries.values()], warnings: [...warnings], parameterDefaultsUsed };
      const accounting = new Map();
      for (const record of allRecords.filter(r => !r.embedded)) accounting.set(record.status, (accounting.get(record.status) || 0) + 1);
      const notes = [
        '# ARM template import',
        '',
        'This is a template snapshot, not live Azure inventory. An export may omit resources. Parameter defaults may differ from deployed values.',
        'Missing or dynamic IP addresses are unknown; no IP addresses are manufactured. No deployment occurs. Processing is local; no network requests are made.',
        'Only requested resource names, containment, references and network addressing are resolved. Secure parameter defaults and unrelated OS, certificate, key and secret properties are ignored.',
        '',
        '## Scope and interpretation',
        'This layout shows declared topology, not a verified traffic path. No source/destination or packet path was supplied or invented. Links represent only exported references, not measured reachability.',
        'NSG/ASG membership, route tables, policies and DNS configuration appear as short owner comments and fuller Notes, never as traffic arrows. UDR comments show explicitly configured destination/next hop, not effective routes or a routing decision.',
        'Resource count includes explicit declarations (including nested resources); embedded VNet subnets/peerings, NSG rules and routes are also bounded and normalized. Duplicate embedded declarations merge into explicit declarations.',
        groupName ? 'The resource group label is supplied by the importer for display only.' : 'No resource group was supplied. The group is explicitly labeled Imported resources; no group is inferred from references.',
        'Resource group labels never establish deployment scope, even alongside options.subscriptionId. Scoped references match only exact exported resource IDs. Unknown external scopes never alias local type/name identities.',
        'Optional options.subscriptionId supplies explicit subscription metadata for subscription() and subscriptionResourceId(); no subscription metadata is inferred. resourceGroup() is unresolved because display labels are not deployment metadata.',
        scopeOrigin === 'supplied'
          ? 'Displayed resource IDs use the subscription supplied at import.'
          : scopeOrigin === 'discovered'
            ? 'Displayed resource IDs use subscription ' + discovered + ', read from a literal resource reference in this template rather than supplied. Confirm it is the subscription that hosts this resource group. Reference resolution did not use it.'
            : 'No subscription was supplied, and none could be read from the template, so displayed resource IDs keep the {subscriptionId} placeholder.',
        'Attached NIC/public-IP details are folded into every explicit endpoint owner. Shared declarations do not prove valid attachment or placement. Unattached supporting configuration, unrelated services and unreferenced remote gateway configuration stay in Notes without guessed owners.',
        'Only referenced remote VPN endpoints remain as cards; they are not equated with Azure gateways by name or address. Connection names label declared tunnels, not live tunnel health.',
        'Owner comments have at most three lines of at most 100 characters, prioritizing routing/security and showing an overflow count. Full names and configured IPs/prefixes remain in Notes. Address fields are limited to two complete IP/CIDR values per card.',
        'IP-only backends require an exact unique address in the gateway VNet, or an explicitly supplied backend VNet. Cross-VNet reachability, DNS names and live health are not inferred. DependsOn is not connectivity.',
        'Notes-only NIC declarations still participate in duplicate-IP checks; they never become inferred workload endpoints.',
        'Copy loops, runtime functions and linked/nested deployment scopes are not evaluated. Unknown conditions do not assert deployment. Child service, DNS record, security-rule and backup configuration is summarized instead of drawn.',
        'Limits: 10 MiB JSON; 2,000 resources including embedded declarations; 300 rendered nodes including groups after support-node removal and NIC/public-IP folding; 12,000 owner-detail entries; JSON/resolution depth 64; expressions 16,384 characters / 4,096 tokens; 500,000 processing steps.',
        '',
        '## Import totals',
        'Explicit resources: ' + resourceCount + '; nodes: ' + ordered.length + '; edges: ' + edges.length + '.',
        'Explicit declaration accounting: ' + [...accounting].map(([status, count]) => status + ' ' + count).join('; ') + '.',
        '',
        '## Summarized or mapped resources',
        ...report.summarized.map(item => '- ' + markdownText(item.type) + ': ' + item.count + ' - ' + markdownText(item.reason) + '.'),
        ...(ownerDetails.length ? ['', '## Per-owner configuration details', ...ownerDetails.map(markdownText)] : []),
        ...(hiddenOwnerDetails.length ? ['', '## Configuration owners not drawn',
          'These explicit configuration associations have no retained topology card; no visible owner was inferred.',
          ...hiddenOwnerDetails.map(markdownText)] : []),
        '',
        '## Configuration retained in Notes',
        ...allRecords.filter(record => record.status !== 'represented').map(record => {
          const owners = [...(supportOwners.get(record) || [])].filter(id => nodeById.has(id));
          return '- ' + markdownText(configurationDetails.get(record) || record.type + ' ' + (record.name || '(unresolved or skipped name)'))
            + ' - ' + record.status + (owners.length ? '; owner nodes: ' + owners.join(', ') : '; no visible owner assigned') + '.';
        }),
        '',
        '## Warnings',
        ...(report.warnings.length ? report.warnings.map(warning => '- ' + markdownText(warning)) : ['None.']),
        ...(notesDetails.length ? ['', '## Additional exported addressing', ...notesDetails.map(markdownText)] : []),
      ].join('\n');
      report.notes = notes;
      progress(85, 'topology');
      const nodeSources = ordered.filter(node => sourceByNode.has(node.id))
        .map(node => ({ nodeId: node.id, resourceId: sourceByNode.get(node.id) }));
      return { diagram, report, notes, nodeSources };
    }
    return { convert };
  };
}());
