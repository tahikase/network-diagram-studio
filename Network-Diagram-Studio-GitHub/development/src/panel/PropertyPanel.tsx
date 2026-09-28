import { useState } from 'react';
import { useDiagramStore } from '../store/diagram-store';
import {
  CATEGORIES_ORDER,
  RESOURCE_TYPES,
  getResourceType,
  type FieldDef,
} from '../model/resource-types';
import type { DiagramEdge, DiagramNode, EdgeKind } from '../model/types';
import { EDGE_KIND_META, EDGE_LINE_STYLES, resolveEdgeDash } from '../canvas/edge-styles';
import { PEN_COLORS, paintColor } from '../theme/palette';
import { iconEntry, useImportedIcons } from '../icons/imported-library';
import { IconPickerModal } from './IconPickerModal';
import { ResizableAside } from './ResizableAside';
import { useT } from '../i18n/useT';
import { customFieldLabel, uniqueCustomFieldKey } from '../model/custom-fields';
import { runtimeExtensions } from '../runtime/extensions';

const EDGE_KINDS: EdgeKind[] = [
  'peering',
  'vpn',
  'expressroute',
  'privateendpoint',
  'backend',
  'dns',
  'internet',
  'link',
];

const inputCls =
  'w-full h-8 px-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400';

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
      {children}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-4 mb-2">
      {children}
    </div>
  );
}

function FieldInput({
  def,
  value,
  onChange,
}: {
  def: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  if (def.kind === 'textarea') {
    return (
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={def.placeholder}
        className="w-full px-2 py-1 text-sm border rounded-md"
        style={{ borderColor: 'var(--color-slate-300)' }}
      />
    );
  }
  if (def.kind === 'select') {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
        style={{ borderColor: 'var(--color-slate-300)' }}
      >
        <option value="">—</option>
        {def.options?.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={def.placeholder}
      className={inputCls}
      style={{ borderColor: 'var(--color-slate-300)' }}
    />
  );
}

/**
 * A row for a user-defined property (key + value) that is not part of
 * the resource type's built-in schema. The key is editable so users can
 * rename fields on the fly; deleting a row wipes the field from
 * `node.data.fields`.
 */
function CustomFieldRow({
  fieldKey,
  value,
  onRename,
  onValueChange,
  onDelete,
}: {
  nodeId: string;
  fieldKey: string;
  value: string;
  onRename: (oldKey: string, newKey: string) => void;
  onValueChange: (v: string) => void;
  onDelete: () => void;
}) {
  const t = useT();
  const label = customFieldLabel(fieldKey);
  const [keyDraft, setKeyDraft] = useState(label);
  const commitKey = () => {
    const next = keyDraft.trim();
    if (!next || next === label) {
      setKeyDraft(label);
      return;
    }
    onRename(fieldKey, next);
  };
  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <input
          type="text"
          value={keyDraft}
          onChange={(e) => setKeyDraft(e.target.value)}
          onBlur={commitKey}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className="flex-1 h-6 px-1.5 text-[11px] font-semibold uppercase tracking-wide border rounded-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
          style={{ borderColor: 'var(--color-slate-200)' }}
          aria-label={t('Custom field name')}
        />
        <button
          type="button"
          onClick={onDelete}
          className="h-6 px-1.5 text-[11px] font-medium text-slate-500 border rounded-sm hover:text-red-600 hover:border-red-300 hover:bg-red-50"
          style={{ borderColor: 'var(--color-slate-200)' }}
          title={t('Delete this custom field')}
          aria-label={t('Delete custom field')}
        >
          ✕
        </button>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={t('Value')}
        className={inputCls}
        style={{ borderColor: 'var(--color-slate-300)' }}
      />
    </div>
  );
}

/**
 * Two-step "+ Add field" affordance. Click reveals a name/value pair;
 * commit adds the field to node.data.fields via updateNodeField and
 * collapses back to the button.
 */
function AddCustomFieldRow({
  existingKeys,
  onAdd,
}: {
  existingKeys: Set<string>;
  onAdd: (key: string, value: string) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [k, setK] = useState('');
  const [v, setV] = useState('');
  const commit = () => {
    const key = k.trim();
    if (!key) return;
    // Duplicate NAMES are allowed — a node showing two "IP address" rows is
    // legitimate. Only the storage key has to be unique, so collisions are
    // disambiguated rather than refused.
    onAdd(uniqueCustomFieldKey(key, existingKeys), v);
    setK('');
    setV('');
    setOpen(false);
  };
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 w-full h-8 text-xs font-medium border-2 border-dashed rounded-md text-slate-600 hover:bg-slate-50 hover:border-slate-400"
        style={{ borderColor: 'var(--color-slate-300)' }}
      >
        + {t('Add custom field')}
      </button>
    );
  }
  return (
    <div
      className="mt-2 p-2 border rounded-md bg-slate-50 space-y-1.5"
      style={{ borderColor: 'var(--color-slate-300)' }}
    >
      <input
        type="text"
        value={k}
        onChange={(e) => setK(e.target.value)}
        placeholder={t('Field name (e.g. Owner)')}
        className={inputCls}
        style={{ borderColor: 'var(--color-slate-300)' }}
      />
      <input
        type="text"
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={t('Value')}
        className={inputCls}
        style={{ borderColor: 'var(--color-slate-300)' }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
        }}
      />
      <div className="flex gap-1">
        <button
          type="button"
          onClick={commit}
          disabled={!k.trim()}
          className="flex-1 h-7 text-xs font-medium rounded-md bg-slate-800 text-white hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {t('Add')}
        </button>
        <button
          type="button"
          onClick={() => {
            setK('');
            setV('');
            setOpen(false);
          }}
          className="flex-1 h-7 text-xs font-medium border rounded-md bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
        >
          {t('Cancel')}
        </button>
      </div>
    </div>
  );
}

function NodePanel({ node }: { node: DiagramNode }) {
  useImportedIcons(s => s.revision);
  const updateNodeName = useDiagramStore((s) => s.updateNodeName);
  const updateNodeSubtitle = useDiagramStore((s) => s.updateNodeSubtitle);
  const updateNodeType = useDiagramStore((s) => s.updateNodeType);
  const updateNodeField = useDiagramStore((s) => s.updateNodeField);
  const removeNodeField = useDiagramStore((s) => s.removeNodeField);
  const updateNodeNotes = useDiagramStore((s) => s.updateNodeNotes);
  const updateNodeIconOverride = useDiagramStore((s) => s.updateNodeIconOverride);
  const updateNodeTextScale = useDiagramStore((s) => s.updateNodeTextScale);
  const removeNode = useDiagramStore((s) => s.removeNode);
  const rt = getResourceType(node.type);
  const t = useT();
  const effectiveIconId = node.data.iconId ?? rt.iconId;
  const iconMeta = iconEntry(effectiveIconId);
  const iconLabel = node.data.typeLabel ?? iconMeta?.label ?? rt.label;
  const hasIconOverride = !!node.data.iconId;
  const [pickerOpen, setPickerOpen] = useState(false);

  const grouped = new Map<string, typeof RESOURCE_TYPES>();
  for (const r of RESOURCE_TYPES) {
    const arr = grouped.get(r.category) ?? [];
    arr.push(r);
    grouped.set(r.category, arr);
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <svg width={24} height={24} aria-hidden="true">
          <use href={`#ic-${effectiveIconId}`} />
        </svg>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-slate-500">{t('Selected node')}</span>
          <span className="text-sm font-semibold text-slate-800">{iconLabel}</span>
        </div>
      </div>

      <div>
        <Label>{t('Name')}</Label>
        <input
          type="text"
          value={node.data.name}
          onChange={(e) => updateNodeName(node.id, e.target.value)}
          className={inputCls}
          style={{ borderColor: 'var(--color-slate-300)' }}
        />
      </div>

      {!rt.isGroup && runtimeExtensions().ndsNonProductionCaptions?.panel(node)}
      {!rt.isGroup && (
        <div>
          <Label>{t('Subtitle')}</Label>
          <input
            type="text"
            value={node.data.subtitle ?? ''}
            onChange={(e) => updateNodeSubtitle(node.id, e.target.value)}
            placeholder={t('e.g. Standard_v2 / 10.0.1.4')}
            className={inputCls}
            style={{ borderColor: 'var(--color-slate-300)' }}
          />
        </div>
      )}

      {/* Text-size control. Adjusts the font size of the node's name +
          type caption at once (single multiplier so both stay visually
          balanced). Same clamp as the store: 0.5..3x. Slider gives fine
          control; the three quick buttons match the on-canvas toolbar. */}
      <div>
        <Label>{t('Text size')}</Label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              updateNodeTextScale(
                node.id,
                Math.max(0.5, (node.data.textScale ?? 1) - 0.1),
              )
            }
            className="h-8 w-8 text-xs font-semibold border rounded-md bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
            title={t('Shrink text')}
          >
            A−
          </button>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={node.data.textScale ?? 1}
            onChange={(e) =>
              updateNodeTextScale(node.id, parseFloat(e.target.value))
            }
            className="flex-1"
          />
          <button
            type="button"
            onClick={() =>
              updateNodeTextScale(
                node.id,
                Math.min(3, (node.data.textScale ?? 1) + 0.1),
              )
            }
            className="h-8 w-8 text-sm font-bold border rounded-md bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
            title={t('Enlarge text')}
          >
            A+
          </button>
          <button
            type="button"
            onClick={() => updateNodeTextScale(node.id, 1)}
            className="h-8 px-2 text-[11px] font-medium border rounded-md bg-white text-slate-700 border-slate-300 hover:bg-slate-100 tabular-nums"
            title={t('Reset to default size')}
          >
            {Math.round((node.data.textScale ?? 1) * 100)}%
          </button>
        </div>
      </div>

      <div>
        <Label>{t('Resource type')}</Label>
        <select
          value={node.type}
          onChange={(e) => updateNodeType(node.id, e.target.value)}
          className={inputCls}
          style={{ borderColor: 'var(--color-slate-300)' }}
        >
          {CATEGORIES_ORDER.filter((c) => grouped.has(c)).map((c) => (
            <optgroup key={c} label={c}>
              {(grouped.get(c) ?? [])
                .slice()
                .sort((a, b) => a.label.localeCompare(b.label))
                .map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <Label>{t('Icon')}</Label>
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 flex items-center justify-center border rounded-md bg-slate-50"
            style={{ borderColor: 'var(--color-slate-300)' }}
          >
            <svg width={28} height={28} aria-hidden="true">
              <use href={`#ic-${effectiveIconId}`} />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-slate-800 truncate" title={iconLabel}>
              {iconLabel}
            </div>
            <div className="text-[11px] text-slate-500 truncate" title={effectiveIconId}>
              {hasIconOverride ? t('Custom icon') : t('Default for type')}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex-1 h-8 text-xs font-medium border rounded-md bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
          >
            {t('Change icon…')}
          </button>
          {hasIconOverride && (
            <button
              type="button"
              onClick={() => updateNodeIconOverride(node.id, undefined, undefined)}
              className="flex-1 h-8 text-xs font-medium border rounded-md bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              title={t('Revert to the default icon for this resource type')}
            >
              {t('Reset')}
            </button>
          )}
        </div>
      </div>

      {(() => {
        const knownKeys = new Set(rt.fields.map((f) => f.key));
        const customFieldEntries = Object.entries(node.data.fields ?? {}).filter(
          ([k]) => !knownKeys.has(k),
        );
        return (
          <>
            {(rt.fields.length > 0 || customFieldEntries.length > 0) && (
              <SectionTitle>{t('Properties')}</SectionTitle>
            )}
            <div className="space-y-2">
              {rt.fields.map((f) => (
                <div key={f.key}>
                  <Label>{f.label}</Label>
                  <FieldInput
                    def={f}
                    value={node.data.fields[f.key] ?? ''}
                    onChange={(v) => updateNodeField(node.id, f.key, v)}
                  />
                </div>
              ))}
              {customFieldEntries.map(([k, v]) => (
                <CustomFieldRow
                  key={k}
                  nodeId={node.id}
                  fieldKey={k}
                  value={v}
                  onRename={(oldKey, newKey) => {
                    // Rename = write new key, remove old key entirely.
                    // The new name may duplicate another row's name, which is
                    // allowed — only the storage key gets disambiguated, and
                    // the row being renamed is excluded from the taken set so
                    // an unchanged name doesn't disambiguate against itself.
                    const taken = new Set(
                      [
                        ...rt.fields.map((f) => f.key),
                        ...customFieldEntries.map(([ck]) => ck),
                      ].filter((ck) => ck !== oldKey),
                    );
                    const unique = uniqueCustomFieldKey(newKey, taken);
                    updateNodeField(node.id, unique, v);
                    removeNodeField(node.id, oldKey);
                  }}
                  onValueChange={(newVal) => updateNodeField(node.id, k, newVal)}
                  onDelete={() => removeNodeField(node.id, k)}
                />
              ))}
            </div>
            <AddCustomFieldRow
              existingKeys={new Set([
                ...rt.fields.map((f) => f.key),
                ...customFieldEntries.map(([k]) => k),
              ])}
              onAdd={(k, v) => updateNodeField(node.id, k, v)}
            />
          </>
        );
      })()}

      <SectionTitle>{t('Notes')}</SectionTitle>
      <textarea
        rows={3}
        value={node.data.notes ?? ''}
        onChange={(e) => updateNodeNotes(node.id, e.target.value)}
        placeholder={t('Free-form notes for this resource')}
        className="w-full px-2 py-1 text-sm border rounded-md"
        style={{ borderColor: 'var(--color-slate-300)' }}
      />
      {runtimeExtensions().ndsArmResourceIds?.panel(node)}

      <div className="pt-2 border-t" style={{ borderColor: 'var(--color-slate-200)' }}>
        <button
          type="button"
          onClick={() => removeNode(node.id)}
          className="w-full h-8 text-sm font-medium rounded-md border border-red-300 text-red-700 bg-white hover:bg-red-50"
        >
          {t('Delete node')}
        </button>
      </div>

      {pickerOpen && (
        <IconPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(icon) => {
            updateNodeIconOverride(node.id, icon.id, icon.label);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

function EdgePanel({ edge }: { edge: DiagramEdge }) {
  const updateEdgeKind = useDiagramStore((s) => s.updateEdgeKind);
  const updateEdgeColor = useDiagramStore((s) => s.updateEdgeColor);
  const updateEdgeLine = useDiagramStore((s) => s.updateEdgeLine);
  const updateEdgeLabel = useDiagramStore((s) => s.updateEdgeLabel);
  const updateEdgeTextScale = useDiagramStore((s) => s.updateEdgeTextScale);
  const removeEdge = useDiagramStore((s) => s.removeEdge);
  const t = useT();

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wide text-slate-500">{t('Selected edge')}</span>
        <span className="text-sm font-semibold text-slate-800">{EDGE_KIND_META[edge.kind].label}</span>
      </div>

      {runtimeExtensions().ndsNonProductionConnectors?.panel(edge)}
      <div>
        <Label>{t('Kind')}</Label>
        <select
          value={edge.kind}
          onChange={(e) => updateEdgeKind(edge.id, e.target.value as EdgeKind)}
          className={inputCls}
          style={{ borderColor: 'var(--color-slate-300)' }}
        >
          {EDGE_KINDS.map((k) => (
            <option key={k} value={k}>
              {EDGE_KIND_META[k].label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label>{t('Line colour')}</Label>
        <div className="flex items-center gap-1.5 flex-wrap">
          {[undefined, ...PEN_COLORS.map((c) => c.hex)].map((hex) => {
            const active = (edge.color ?? undefined) === hex;
            return (
              <button
                key={hex ?? 'default'}
                type="button"
                data-nds-panel-edge-color={hex ?? 'default'}
                title={hex ?? t('Default colour')}
                aria-label={hex ?? t('Default colour')}
                aria-pressed={active}
                onClick={() => updateEdgeColor(edge.id, hex)}
                className="rounded-full cursor-pointer shrink-0"
                style={{
                  width: 20,
                  height: 20,
                  background: paintColor(hex) ?? EDGE_KIND_META[edge.kind].color,
                  border: active
                    ? '2px solid var(--color-slate-900)'
                    : '1px solid var(--color-slate-300)',
                  // Ring the "default" chip so it reads as "revert", not as
                  // just another colour that happens to match the kind.
                  boxShadow: hex ? 'none' : 'inset 0 0 0 3px var(--nds-panel)',
                }}
              />
            );
          })}
        </div>
      </div>

      <div>
        <Label>{t('Line style')}</Label>
        <div className="flex items-center gap-1.5 flex-wrap">
          {EDGE_LINE_STYLES.map((opt) => {
            const active = (edge.line ?? undefined) === opt.id;
            // "Auto" previews the kind's own pattern, so the option shows what
            // reverting would actually look like rather than a generic line.
            const dash = opt.id ? opt.preview : (resolveEdgeDash(edge.kind) ?? '');
            return (
              <button
                key={opt.id ?? 'auto'}
                type="button"
                data-nds-panel-edge-line={opt.id ?? 'auto'}
                title={t(opt.label)}
                aria-label={t(opt.label)}
                aria-pressed={active}
                onClick={() => updateEdgeLine(edge.id, opt.id)}
                className="rounded cursor-pointer shrink-0 flex items-center justify-center"
                style={{
                  width: 44,
                  height: 26,
                  // Tint the "Auto" slot so it reads as REVERT, not as a
                  // fourth pattern — its preview is deliberately identical to
                  // one of the others whenever the kind already matches.
                  background: opt.id ? 'var(--nds-panel)' : 'var(--color-slate-100)',
                  border: active
                    ? '2px solid var(--color-slate-900)'
                    : '1px solid var(--color-slate-300)',
                }}
              >
                <svg width={30} height={10} aria-hidden="true">
                  <line
                    x1={1}
                    y1={5}
                    x2={29}
                    y2={5}
                    stroke={paintColor(edge.color) ?? EDGE_KIND_META[edge.kind].color}
                    strokeWidth={2}
                    strokeLinecap="butt"
                    strokeDasharray={dash || undefined}
                  />
                </svg>
              </button>
            );
          })}
        </div>
      </div>

      {/* Label text-size control. Same shape and same 0.5..3 clamp as the
          node panel's, so a diagram's edge labels and its card text are
          adjusted the same way. The % button resets to 100%. */}
      <div>
        <Label>{t('Text size')}</Label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-nds-panel-edge-text-scale="down"
            onClick={() =>
              updateEdgeTextScale(edge.id, Math.max(0.5, (edge.textScale ?? 1) - 0.1))
            }
            className="h-8 w-8 text-xs font-semibold border rounded-md bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
            title={t('Shrink text')}
            aria-label={t('Shrink text')}
          >
            A−
          </button>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={edge.textScale ?? 1}
            onChange={(e) => updateEdgeTextScale(edge.id, parseFloat(e.target.value))}
            className="flex-1"
            aria-label={t('Text size')}
          />
          <button
            type="button"
            data-nds-panel-edge-text-scale="up"
            onClick={() =>
              updateEdgeTextScale(edge.id, Math.min(3, (edge.textScale ?? 1) + 0.1))
            }
            className="h-8 w-8 text-sm font-bold border rounded-md bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
            title={t('Enlarge text')}
            aria-label={t('Enlarge text')}
          >
            A+
          </button>
          <button
            type="button"
            data-nds-panel-edge-text-scale="reset"
            onClick={() => updateEdgeTextScale(edge.id, 1)}
            className="h-8 px-2 text-[11px] font-medium border rounded-md bg-white text-slate-700 border-slate-300 hover:bg-slate-100 tabular-nums"
            title={t('Reset to default size')}
            aria-label={t('Reset to default size')}
          >
            {Math.round((edge.textScale ?? 1) * 100)}%
          </button>
        </div>
      </div>

      <div>
        <Label>{t('Label')}</Label>
        <input
          type="text"
          value={edge.label ?? ''}
          onChange={(e) => updateEdgeLabel(edge.id, e.target.value)}
          placeholder={t('e.g. 10.0.0.0/24 or HTTPS 443')}
          className={inputCls}
          style={{ borderColor: 'var(--color-slate-300)' }}
        />
      </div>

      <div className="pt-2 border-t" style={{ borderColor: 'var(--color-slate-200)' }}>
        <button
          type="button"
          onClick={() => removeEdge(edge.id)}
          className="w-full h-8 text-sm font-medium rounded-md border border-red-300 text-red-700 bg-white hover:bg-red-50"
        >
          {t('Delete edge')}
        </button>
      </div>
    </div>
  );
}

export function PropertyPanel() {
  const nodeId = useDiagramStore((s) => s.selectedNodeId);
  const edgeId = useDiagramStore((s) => s.selectedEdgeId);
  const node = useDiagramStore((s) =>
    nodeId ? s.diagram.nodes.find((n) => n.id === nodeId) ?? null : null
  );
  const edge = useDiagramStore((s) =>
    edgeId ? s.diagram.edges.find((e) => e.id === edgeId) ?? null : null
  );

  // Nothing selected → render nothing at all, so the flex row hands the
  // full width back to <main>. The canvas gets ~340px wider and the
  // annotation toolbar (absolute right-3 INSIDE main) rides out to the
  // right edge on its own. Selecting a node/edge remounts the aside, the
  // canvas narrows, and the toolbar slides back left. An empty panel with
  // nothing but usage hints was pure wasted width.
  if (!node && !edge) return null;

  return (
    <ResizableAside
      side="left"
      storageKey="nds.propertyPanelWidth"
      defaultWidth={340}
      minWidth={220}
      maxWidth={560}
      className="h-full bg-white border-l overflow-y-auto nds-scroll"
      style={{ borderColor: 'var(--color-slate-200)' }}
      data-nds-property-panel="1"
    >
      {/* `key` forces a fresh mount per selection. Without it React reuses the
          panel instance, and an uncommitted draft (a half-typed custom-field
          NAME, which commits on blur) would be flushed against the newly
          selected node — silently renaming a field on a node the user never
          touched. */}
      {node ? (
        <NodePanel key={node.id} node={node} />
      ) : edge ? (
        <EdgePanel key={edge.id} edge={edge} />
      ) : null}
    </ResizableAside>
  );
}
