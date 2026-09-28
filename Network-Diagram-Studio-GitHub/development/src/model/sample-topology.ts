import type { Diagram } from './types';

export function makeSampleTopology(): Diagram {
  const now = new Date().toISOString();
  return {
    version: 1,
    meta: {
      title: 'Sample: AppGW → VM behind WAF policy',
      caseId: '',
      author: '',
      createdUtc: now,
      updatedUtc: now,
      notes: 'Load this to see how the tool renders a real topology.',
    },
    nodes: [
      {
        id: 'grp-region',
        type: 'group-region',
        position: { x: 40, y: 60 },
        size: { w: 1080, h: 620 },
        data: { name: 'East US', state: 'ok', fields: { region: 'eastus' } },
      },
      {
        id: 'grp-vnet',
        type: 'group-vnet',
        parent: 'grp-region',
        position: { x: 300, y: 90 },
        size: { w: 720, h: 520 },
        data: { name: 'vnet-appgw-bnf', state: 'ok', fields: { cidr: '10.10.0.0/16', region: 'eastus' } },
      },
      {
        id: 'grp-subnet-agw',
        type: 'group-subnet',
        parent: 'grp-vnet',
        position: { x: 60, y: 80 },
        size: { w: 300, h: 400 },
        data: { name: 'snet-appgw', state: 'ok', fields: { cidr: '10.10.1.0/24' } },
      },
      {
        id: 'grp-subnet-web',
        type: 'group-subnet',
        parent: 'grp-vnet',
        position: { x: 380, y: 80 },
        size: { w: 300, h: 400 },
        data: { name: 'snet-web', state: 'ok', fields: { cidr: '10.10.2.0/24' } },
      },
      {
        id: 'client',
        type: 'user',
        position: { x: 80, y: 320 },
        data: { name: 'Client', state: 'ok', fields: { location: 'Internet' } },
      },
      {
        id: 'pip',
        type: 'pip',
        parent: 'grp-subnet-agw',
        position: { x: 40, y: 40 },
        data: { name: 'pip-appgw-bnf', state: 'ok', fields: { sku: 'Standard', assignment: 'Static' } },
      },
      {
        id: 'appgw',
        type: 'appgw',
        parent: 'grp-subnet-agw',
        position: { x: 40, y: 180 },
        data: {
          name: 'agw-bnf',
          subtitle: 'WAF_v2 · Stopped',
          state: 'broken',
          fields: { sku: 'WAF_v2', capacity: '1-10', frontendIp: 'pip-appgw-bnf', wafPolicy: 'wafpol-agw-bnf' },
          notes: 'operationalState=Stopped',
        },
      },
      {
        id: 'wafpol',
        type: 'waf-policy',
        parent: 'grp-subnet-agw',
        position: { x: 40, y: 320 },
        data: {
          name: 'wafpol-agw-bnf',
          state: 'degraded',
          fields: { mode: 'Prevention', ruleset: 'OWASP 3.2' },
        },
      },
      {
        id: 'vm',
        type: 'vm',
        parent: 'grp-subnet-web',
        position: { x: 40, y: 160 },
        data: {
          name: 'vm-web01',
          state: 'ok',
          fields: { os: 'Ubuntu 22.04', size: 'Standard_D2s_v5', privateIp: '10.10.2.4' },
        },
      },
    ],
    edges: [
      { id: 'e-client-pip', source: 'client', target: 'pip', kind: 'internet', label: 'HTTPS 443' },
      { id: 'e-pip-appgw', source: 'pip', target: 'appgw', kind: 'link' },
      { id: 'e-appgw-wafpol', source: 'appgw', target: 'wafpol', kind: 'link', label: 'firewallPolicy' },
      { id: 'e-appgw-vm', source: 'appgw', target: 'vm', kind: 'backend', label: 'HTTP 80', state: 'broken' },
    ],
    annotations: [],
  };
}

export function makeEmptyTopology(): Diagram {
  const now = new Date().toISOString();
  return {
    version: 1,
    meta: {
      title: 'Untitled diagram',
      caseId: '',
      author: '',
      createdUtc: now,
      updatedUtc: now,
    },
    nodes: [],
    edges: [],
    annotations: [],
  };
}
