// Demo-only template registry.
//
// Each template is a starter Azure Networking topology tuned to a common
// support scenario. Templates are built with rough positions (all at 0,0);
// `useDiagramStore.loadDiagram()` runs the topology through
// `relayoutForNoOverlap` which spreads children into a row-flow inside
// each parent, so authors only need to declare the parent/child hierarchy
// and let the layout engine place things.
//
// To add a template:
//   1. Append a call to `tpl(...)` at the bottom of TEMPLATES.
//   2. `nodes` uses the slug catalog from src/model/resource-types.ts.
//   3. `edges` connects by node id; `kind` maps to the same enum used
//      elsewhere (peering, vpn, expressroute, privateendpoint, backend,
//      dns, internet, link).
//
// This file is imported ONLY from src/demo/*, so it never lands in the
// production bundle (`src/index.css` excludes ./demo/**/*).

import type { Diagram, DiagramEdge, DiagramNode, EdgeKind, StateColor } from '../../model/types';
import { containerSize } from './container-size';

export interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  /** Extra searchable strings (aliases, related keywords, common issues). */
  keywords: string[];
  /**
   * The Microsoft Learn diagram this template rebuilds, when there is one.
   *
   * A template is the EDITABLE form of a published diagram — the doc image
   * can be previewed in the Learn diagrams section, but only a template can
   * be re-laid out, annotated, and handed to a customer. Recording the source
   * keeps the two halves connected: the reader can check the topology against
   * Microsoft's own guidance instead of trusting this file.
   *
   * `url` is validated by `npm run check:links`, so a retired article shows
   * up as a build-adjacent failure rather than a dead link in the UI.
   */
  source?: { title: string; url: string };
  build: () => Diagram;
}

interface TplNode {
  id: string;
  type: string;
  name: string;
  parent?: string;
  state?: StateColor;
  subtitle?: string;
  fields?: Record<string, string>;
  notes?: string;
}

interface TplEdge {
  source: string;
  target: string;
  kind?: EdgeKind;
  label?: string;
  state?: StateColor;
}

function makeNode(t: TplNode): DiagramNode {
  return {
    id: t.id,
    type: t.type,
    parent: t.parent,
    position: { x: 0, y: 0 },
    size: containerSize(t.type),
    data: {
      name: t.name,
      subtitle: t.subtitle,
      state: t.state ?? 'ok',
      fields: t.fields ?? {},
      notes: t.notes,
    },
  };
}

function makeEdge(e: TplEdge, i: number): DiagramEdge {
  return {
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    kind: e.kind ?? 'link',
    label: e.label,
    state: e.state,
  };
}

function tpl(
  id: string,
  name: string,
  category: string,
  description: string,
  keywords: string[],
  nodes: TplNode[],
  edges: TplEdge[]
): Template {
  return {
    id,
    name,
    category,
    description,
    keywords,
    build: () => {
      const now = new Date().toISOString();
      return {
        version: 1,
        meta: {
          title: name,
          caseId: '',
          author: '',
          createdUtc: now,
          updatedUtc: now,
          notes: description,
        },
        nodes: nodes.map(makeNode),
        edges: edges.map(makeEdge),
        annotations: [],
      };
    },
  };
}

// Categories are shown in this order in the Templates tab.
export const TEMPLATE_CATEGORIES = [
  'Hybrid Connectivity',
  'Hub & Spoke',
  'Virtual WAN',
  'Peering',
  'Application Delivery',
  'Load Balancing',
  'Private Endpoint & Private Link',
  'Firewall & Security',
  'DNS',
  'NAT & Egress',
  'Remote Access',
  'Kubernetes',
  'Segmentation & Routing',
  'Multi-Region & DR',
  'Monitoring & Diagnostics',
] as const;

export const TEMPLATES: Template[] = [
  // =========================================================================
  // HYBRID CONNECTIVITY (VPN + ExpressRoute)
  // =========================================================================
  tpl(
    'vpn-s2s-routebased',
    'Site-to-Site VPN (Route-based, BGP)',
    'Hybrid Connectivity',
    'Classic S2S VPN between on-prem and Azure VNet using route-based VPN gateway with BGP.',
    ['ipsec', 'ikev2', 'bgp', 'tunnel down', 'psk', 'on-prem', 'local network gateway'],
    [
      { id: 'onprem', type: 'group-onprem', name: 'On-premises site' },
      { id: 'onprem-fw', type: 'nva', parent: 'onprem', name: 'On-prem VPN device', fields: { vendor: 'Cisco/Fortinet', model: 'ASA/FortiGate' } },
      { id: 'region', type: 'group-region', name: 'East US', fields: { region: 'eastus' } },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-hub', fields: { cidr: '10.0.0.0/16', region: 'eastus' } },
      { id: 'gw-subnet', type: 'group-subnet', parent: 'vnet', name: 'GatewaySubnet', fields: { cidr: '10.0.255.0/27' } },
      { id: 'workload-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-workload', fields: { cidr: '10.0.1.0/24' } },
      { id: 'pip', type: 'pip', parent: 'gw-subnet', name: 'pip-vpngw', fields: { sku: 'Standard', assignment: 'Static' } },
      { id: 'vpngw', type: 'vpn-gw', parent: 'gw-subnet', name: 'vpngw-hub', fields: { sku: 'VpnGw2', type: 'RouteBased', asn: '65515' } },
      { id: 'lng', type: 'local-gw', name: 'lng-onprem', fields: { publicIp: '203.0.113.10', addressSpace: '192.168.0.0/16' } },
      { id: 'conn', type: 'connection', name: 'conn-s2s', fields: { type: 'IPsec', psk: 'Yes' }, notes: 'BGP enabled' },
      { id: 'vm', type: 'vm', parent: 'workload-subnet', name: 'vm-workload01', fields: { os: 'Ubuntu 22.04', privateIp: '10.0.1.4' } },
    ],
    [
      { source: 'onprem-fw', target: 'pip', kind: 'vpn', label: 'IPsec/IKEv2' },
      { source: 'lng', target: 'conn', kind: 'link' },
      { source: 'vpngw', target: 'conn', kind: 'link' },
      { source: 'vpngw', target: 'pip', kind: 'link' },
      { source: 'vpngw', target: 'vm', kind: 'link', label: 'BGP route' },
    ]
  ),

  tpl(
    'vpn-p2s-aad',
    'Point-to-Site VPN (Azure AD auth)',
    'Hybrid Connectivity',
    'Remote user connects to Azure VPN Gateway using OpenVPN + Azure AD authentication.',
    ['openvpn', 'certificate', 'vpn client', 'aad auth', 'radius'],
    [
      { id: 'user', type: 'user', name: 'Remote user', fields: { location: 'Internet' } },
      { id: 'region', type: 'group-region', name: 'East US', fields: { region: 'eastus' } },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-hub', fields: { cidr: '10.0.0.0/16' } },
      { id: 'gw-subnet', type: 'group-subnet', parent: 'vnet', name: 'GatewaySubnet', fields: { cidr: '10.0.255.0/27' } },
      { id: 'wkl-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-workload', fields: { cidr: '10.0.1.0/24' } },
      { id: 'pip', type: 'pip', parent: 'gw-subnet', name: 'pip-vpngw', fields: { sku: 'Standard' } },
      { id: 'vpngw', type: 'vpn-gw', parent: 'gw-subnet', name: 'vpngw-p2s', subtitle: 'P2S: OpenVPN + AAD', fields: { sku: 'VpnGw2', type: 'RouteBased' } },
      { id: 'vm', type: 'vm', parent: 'wkl-subnet', name: 'vm-workload01', fields: { privateIp: '10.0.1.4' } },
    ],
    [
      { source: 'user', target: 'pip', kind: 'vpn', label: 'OpenVPN (443)' },
      { source: 'vpngw', target: 'pip', kind: 'link' },
      { source: 'vpngw', target: 'vm', kind: 'link', label: 'P2S client IP pool' },
    ]
  ),

  tpl(
    'vnet-to-vnet-vpn',
    'VNet-to-VNet VPN',
    'Hybrid Connectivity',
    'Two VNets in different regions connected via VPN gateways (VNet2VNet connection).',
    ['cross-region', 'vpn gateway', 'v2v'],
    [
      { id: 'r1', type: 'group-region', name: 'East US', fields: { region: 'eastus' } },
      { id: 'v1', type: 'group-vnet', parent: 'r1', name: 'vnet-east', fields: { cidr: '10.0.0.0/16' } },
      { id: 's1', type: 'group-subnet', parent: 'v1', name: 'GatewaySubnet' },
      { id: 'gw1', type: 'vpn-gw', parent: 's1', name: 'vpngw-east' },
      { id: 'vm1', type: 'vm', parent: 'v1', name: 'vm-east01' },
      { id: 'r2', type: 'group-region', name: 'West US', fields: { region: 'westus' } },
      { id: 'v2', type: 'group-vnet', parent: 'r2', name: 'vnet-west', fields: { cidr: '10.1.0.0/16' } },
      { id: 's2', type: 'group-subnet', parent: 'v2', name: 'GatewaySubnet' },
      { id: 'gw2', type: 'vpn-gw', parent: 's2', name: 'vpngw-west' },
      { id: 'vm2', type: 'vm', parent: 'v2', name: 'vm-west01' },
      { id: 'conn', type: 'connection', name: 'conn-v2v', fields: { type: 'VNet2VNet' } },
    ],
    [
      { source: 'gw1', target: 'conn', kind: 'link' },
      { source: 'gw2', target: 'conn', kind: 'link' },
      { source: 'gw1', target: 'vm1', kind: 'link' },
      { source: 'gw2', target: 'vm2', kind: 'link' },
    ]
  ),

  tpl(
    'expressroute-private-peering',
    'ExpressRoute Private Peering',
    'Hybrid Connectivity',
    'On-prem network connected to Azure VNet via ExpressRoute circuit with private peering.',
    ['er', 'msee', 'meet-me', 'private peering', 'circuit', 'bandwidth', 'bgp'],
    [
      { id: 'onprem', type: 'group-onprem', name: 'On-premises' },
      { id: 'cust-edge', type: 'nva', parent: 'onprem', name: 'Customer edge router' },
      { id: 'sp', type: 'internet', name: 'Service Provider' },
      { id: 'er', type: 'er-circuit', name: 'er-hub', subtitle: 'Provisioned', fields: { sku: 'Standard', bandwidth: '1 Gbps', peeringLocation: 'Washington DC' } },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-hub', fields: { cidr: '10.0.0.0/16' } },
      { id: 'gw-subnet', type: 'group-subnet', parent: 'vnet', name: 'GatewaySubnet' },
      { id: 'ergw', type: 'er-gw', parent: 'gw-subnet', name: 'ergw-hub', fields: { sku: 'ErGw2Az', scaleUnits: '2' } },
      { id: 'conn', type: 'connection', name: 'conn-er', fields: { type: 'ExpressRoute' } },
      { id: 'wkl-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-workload' },
      { id: 'vm', type: 'vm', parent: 'wkl-subnet', name: 'vm-workload01' },
    ],
    [
      { source: 'cust-edge', target: 'sp', kind: 'link' },
      { source: 'sp', target: 'er', kind: 'expressroute', label: 'Private peering' },
      { source: 'er', target: 'conn', kind: 'link' },
      { source: 'ergw', target: 'conn', kind: 'link' },
      { source: 'ergw', target: 'vm', kind: 'link', label: 'BGP route' },
    ]
  ),

  tpl(
    'er-vpn-failover',
    'ExpressRoute + VPN Failover',
    'Hybrid Connectivity',
    'ExpressRoute primary path with Site-to-Site VPN acting as backup (coexist configuration).',
    ['ha', 'coexistence', 'backup path', 'primary secondary', 'transit routing'],
    [
      { id: 'onprem', type: 'group-onprem', name: 'On-premises' },
      { id: 'edge', type: 'nva', parent: 'onprem', name: 'Edge device' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-hub' },
      { id: 'gw-subnet', type: 'group-subnet', parent: 'vnet', name: 'GatewaySubnet' },
      { id: 'ergw', type: 'er-gw', parent: 'gw-subnet', name: 'ergw-hub', subtitle: 'Primary path' },
      { id: 'vpngw', type: 'vpn-gw', parent: 'gw-subnet', name: 'vpngw-hub', subtitle: 'Backup path' },
      { id: 'er', type: 'er-circuit', name: 'er-hub' },
      { id: 'lng', type: 'local-gw', name: 'lng-onprem' },
      { id: 'wkl', type: 'vm', parent: 'vnet', name: 'vm-workload' },
    ],
    [
      { source: 'edge', target: 'er', kind: 'expressroute', label: 'Primary' },
      { source: 'edge', target: 'lng', kind: 'vpn', label: 'Backup', state: 'degraded' },
      { source: 'er', target: 'ergw', kind: 'link' },
      { source: 'lng', target: 'vpngw', kind: 'link' },
      { source: 'ergw', target: 'wkl', kind: 'link' },
      { source: 'vpngw', target: 'wkl', kind: 'link' },
    ]
  ),

  // =========================================================================
  // HUB & SPOKE / vWAN
  // =========================================================================
  tpl(
    'hub-spoke-fw-bastion',
    'Hub-and-Spoke (Firewall + Bastion)',
    'Hub & Spoke',
    'Classic hub-and-spoke: Azure Firewall + Bastion in hub, two spoke VNets peered with gateway transit.',
    ['topology', 'transit', 'peering', 'e-w', 'shared services'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'hub', type: 'group-vnet', parent: 'region', name: 'vnet-hub', fields: { cidr: '10.0.0.0/16' } },
      { id: 'hub-fw-subnet', type: 'group-subnet', parent: 'hub', name: 'AzureFirewallSubnet', fields: { cidr: '10.0.1.0/26' } },
      { id: 'afw', type: 'firewall', parent: 'hub-fw-subnet', name: 'afw-hub', fields: { sku: 'Standard', privateIp: '10.0.1.4' } },
      { id: 'hub-bastion-subnet', type: 'group-subnet', parent: 'hub', name: 'AzureBastionSubnet', fields: { cidr: '10.0.2.0/26' } },
      { id: 'bastion', type: 'bastion', parent: 'hub-bastion-subnet', name: 'bastion-hub' },
      { id: 'spoke1', type: 'group-vnet', parent: 'region', name: 'vnet-spoke1', fields: { cidr: '10.1.0.0/16' } },
      { id: 'sp1-wkl-subnet', type: 'group-subnet', parent: 'spoke1', name: 'snet-workload', fields: { cidr: '10.1.1.0/24' } },
      { id: 'vm1', type: 'vm', parent: 'sp1-wkl-subnet', name: 'vm-app01' },
      { id: 'spoke2', type: 'group-vnet', parent: 'region', name: 'vnet-spoke2', fields: { cidr: '10.2.0.0/16' } },
      { id: 'sp2-wkl-subnet', type: 'group-subnet', parent: 'spoke2', name: 'snet-workload', fields: { cidr: '10.2.1.0/24' } },
      { id: 'vm2', type: 'vm', parent: 'sp2-wkl-subnet', name: 'vm-db01' },
      { id: 'udr1', type: 'udr', name: 'rt-spoke1' },
      { id: 'udr2', type: 'udr', name: 'rt-spoke2' },
    ],
    [
      { source: 'hub', target: 'spoke1', kind: 'peering', label: 'peer' },
      { source: 'hub', target: 'spoke2', kind: 'peering', label: 'peer' },
      { source: 'vm1', target: 'afw', kind: 'link', label: '0.0.0.0/0 next hop' },
      { source: 'vm2', target: 'afw', kind: 'link', label: '0.0.0.0/0 next hop' },
      { source: 'afw', target: 'vm1', kind: 'link' },
      { source: 'afw', target: 'vm2', kind: 'link' },
      { source: 'bastion', target: 'vm1', kind: 'link', label: 'RDP/SSH' },
      { source: 'bastion', target: 'vm2', kind: 'link', label: 'RDP/SSH' },
      { source: 'udr1', target: 'sp1-wkl-subnet', kind: 'link' },
      { source: 'udr2', target: 'sp2-wkl-subnet', kind: 'link' },
    ]
  ),

  tpl(
    'vwan-secured-hub',
    'Virtual WAN (Secured Hub)',
    'Hub & Spoke',
    'Virtual WAN hub with Azure Firewall (Secured vHub) and two connected VNets.',
    ['vwan', 'secured virtual hub', 'firewall manager', 'branch'],
    [
      { id: 'vwan', type: 'vwan', name: 'vwan-global' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vhub', type: 'vwan-hub', parent: 'region', name: 'vhub-east', fields: { region: 'eastus', addressPrefix: '10.100.0.0/23' } },
      { id: 'afw', type: 'firewall', parent: 'region', name: 'afw-vhub', subtitle: 'Managed by Firewall Manager', fields: { sku: 'Premium' } },
      { id: 'vnet1', type: 'group-vnet', parent: 'region', name: 'vnet-conn1', fields: { cidr: '10.10.0.0/16' } },
      { id: 'vm1', type: 'vm', parent: 'vnet1', name: 'vm-app01' },
      { id: 'vnet2', type: 'group-vnet', parent: 'region', name: 'vnet-conn2', fields: { cidr: '10.20.0.0/16' } },
      { id: 'vm2', type: 'vm', parent: 'vnet2', name: 'vm-db01' },
    ],
    [
      { source: 'vwan', target: 'vhub', kind: 'link' },
      { source: 'vhub', target: 'afw', kind: 'link' },
      { source: 'vhub', target: 'vnet1', kind: 'link', label: 'vhub conn' },
      { source: 'vhub', target: 'vnet2', kind: 'link', label: 'vhub conn' },
      { source: 'afw', target: 'vm1', kind: 'link' },
      { source: 'afw', target: 'vm2', kind: 'link' },
    ]
  ),

  // =========================================================================
  // PEERING
  // =========================================================================
  tpl(
    'vnet-peering-same-region',
    'VNet Peering (Same Region)',
    'Peering',
    'Two VNets in the same region connected by VNet peering — direct backbone routing.',
    ['peer', 'regional peering', 'transit'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'v1', type: 'group-vnet', parent: 'region', name: 'vnet-a', fields: { cidr: '10.0.0.0/16' } },
      { id: 'v2', type: 'group-vnet', parent: 'region', name: 'vnet-b', fields: { cidr: '10.1.0.0/16' } },
      { id: 'vm1', type: 'vm', parent: 'v1', name: 'vm-a01' },
      { id: 'vm2', type: 'vm', parent: 'v2', name: 'vm-b01' },
    ],
    [
      { source: 'v1', target: 'v2', kind: 'peering', label: 'peer' },
      { source: 'vm1', target: 'vm2', kind: 'link', label: '10.1.0.4' },
    ]
  ),

  tpl(
    'vnet-peering-global',
    'Global VNet Peering',
    'Peering',
    'Two VNets in different regions connected by Global VNet peering.',
    ['global peer', 'cross-region', 'transit'],
    [
      { id: 'r1', type: 'group-region', name: 'East US' },
      { id: 'v1', type: 'group-vnet', parent: 'r1', name: 'vnet-east' },
      { id: 'vm1', type: 'vm', parent: 'v1', name: 'vm-east' },
      { id: 'r2', type: 'group-region', name: 'West Europe' },
      { id: 'v2', type: 'group-vnet', parent: 'r2', name: 'vnet-weu' },
      { id: 'vm2', type: 'vm', parent: 'v2', name: 'vm-weu' },
    ],
    [
      { source: 'v1', target: 'v2', kind: 'peering', label: 'global peer' },
      { source: 'vm1', target: 'vm2', kind: 'link' },
    ]
  ),

  // =========================================================================
  // APPLICATION DELIVERY
  // =========================================================================
  tpl(
    'appgw-waf-vmss',
    'App Gateway WAF v2 → VMSS',
    'Application Delivery',
    'Application Gateway WAF v2 in front of a VM Scale Set backend — classic web app entry point.',
    ['502', '504', 'waf', 'ssl', 'health probe', 'backend pool', 'listener'],
    [
      { id: 'user', type: 'user', name: 'Client' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app', fields: { cidr: '10.0.0.0/16' } },
      { id: 'agw-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-appgw', fields: { cidr: '10.0.1.0/24' } },
      { id: 'pip', type: 'pip', parent: 'agw-subnet', name: 'pip-agw', fields: { sku: 'Standard' } },
      { id: 'agw', type: 'appgw', parent: 'agw-subnet', name: 'agw-web', fields: { sku: 'WAF_v2', capacity: '1-10' } },
      { id: 'waf', type: 'waf-policy', name: 'wafpol-web', fields: { mode: 'Prevention', ruleset: 'OWASP 3.2' } },
      { id: 'web-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-web', fields: { cidr: '10.0.2.0/24' } },
      { id: 'vmss', type: 'vmss', parent: 'web-subnet', name: 'vmss-web' },
    ],
    [
      { source: 'user', target: 'pip', kind: 'internet', label: 'HTTPS 443' },
      { source: 'pip', target: 'agw', kind: 'link' },
      { source: 'agw', target: 'waf', kind: 'link', label: 'firewallPolicy' },
      { source: 'agw', target: 'vmss', kind: 'backend', label: 'HTTP 80' },
    ]
  ),

  tpl(
    'appgw-appservice-pe',
    'App Gateway → App Service (Private Endpoint)',
    'Application Delivery',
    'App Gateway fronting an App Service reached via Private Endpoint — hybrid PaaS pattern.',
    ['app service', 'private endpoint', 'private link', 'ase', 'custom domain'],
    [
      { id: 'user', type: 'user', name: 'Client' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app' },
      { id: 'agw-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-appgw' },
      { id: 'pip', type: 'pip', parent: 'agw-subnet', name: 'pip-agw' },
      { id: 'agw', type: 'appgw', parent: 'agw-subnet', name: 'agw-front', fields: { sku: 'WAF_v2' } },
      { id: 'pe-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-pe' },
      { id: 'pe', type: 'private-endpoint', parent: 'pe-subnet', name: 'pe-webapp', fields: { targetResource: 'webapp-contoso' } },
      { id: 'webapp', type: 'app-service', name: 'webapp-contoso', fields: { kind: 'Web' } },
      { id: 'dns', type: 'dns-zone', name: 'privatelink.azurewebsites.net', fields: { kind: 'Private' } },
    ],
    [
      { source: 'user', target: 'pip', kind: 'internet', label: 'HTTPS' },
      { source: 'pip', target: 'agw', kind: 'link' },
      { source: 'agw', target: 'pe', kind: 'backend', label: 'HTTPS to PE' },
      { source: 'pe', target: 'webapp', kind: 'privateendpoint' },
      { source: 'pe', target: 'dns', kind: 'dns', label: 'A record' },
    ]
  ),

  tpl(
    'front-door-origin',
    'Front Door Premium → Origin (Private Link)',
    'Application Delivery',
    'Azure Front Door Premium with Private Link origin — global entry with private backend.',
    ['afd', 'global', 'anycast', 'origin group', 'private origin', 'wafp'],
    [
      { id: 'user', type: 'user', name: 'Client' },
      { id: 'fd', type: 'front-door', name: 'fd-global', fields: { sku: 'Premium', endpoint: 'contoso.z01.azurefd.net' } },
      { id: 'wafp', type: 'waf-policy', name: 'wafpol-fd', fields: { mode: 'Prevention' } },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app' },
      { id: 'pls-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-pls' },
      { id: 'ilb', type: 'lb', parent: 'pls-subnet', name: 'lb-internal', fields: { sku: 'Standard', type: 'Internal' } },
      { id: 'pls', type: 'private-link-service', parent: 'pls-subnet', name: 'pls-origin' },
      { id: 'wkl-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-web' },
      { id: 'vmss', type: 'vmss', parent: 'wkl-subnet', name: 'vmss-web' },
    ],
    [
      { source: 'user', target: 'fd', kind: 'internet', label: 'HTTPS 443' },
      { source: 'fd', target: 'wafp', kind: 'link' },
      { source: 'fd', target: 'pls', kind: 'privateendpoint', label: 'Private Link origin' },
      { source: 'pls', target: 'ilb', kind: 'link' },
      { source: 'ilb', target: 'vmss', kind: 'backend' },
    ]
  ),

  tpl(
    'traffic-manager-perf',
    'Traffic Manager (Performance)',
    'Application Delivery',
    'DNS-based load balancing across two regions with Performance routing.',
    ['dns lb', 'geo failover', 'endpoint monitor', 'atm'],
    [
      { id: 'user', type: 'user', name: 'Client' },
      { id: 'tm', type: 'traffic-manager', name: 'tm-global', fields: { routing: 'Performance' } },
      { id: 'r1', type: 'group-region', name: 'East US' },
      { id: 'app1', type: 'app-service', parent: 'r1', name: 'app-eastus', fields: { kind: 'Web' } },
      { id: 'pip1', type: 'pip', parent: 'r1', name: 'pip-eastus' },
      { id: 'r2', type: 'group-region', name: 'West Europe' },
      { id: 'app2', type: 'app-service', parent: 'r2', name: 'app-weu', fields: { kind: 'Web' } },
      { id: 'pip2', type: 'pip', parent: 'r2', name: 'pip-weu' },
    ],
    [
      { source: 'user', target: 'tm', kind: 'dns', label: 'DNS query' },
      { source: 'tm', target: 'app1', kind: 'link', label: 'endpoint (Enabled)' },
      { source: 'tm', target: 'app2', kind: 'link', label: 'endpoint (Enabled)' },
      { source: 'user', target: 'pip1', kind: 'internet' },
      { source: 'user', target: 'pip2', kind: 'internet' },
    ]
  ),

  tpl(
    'apim-internal-vnet',
    'API Management (Internal VNet mode)',
    'Application Delivery',
    'APIM deployed in Internal VNet mode fronted by App Gateway for public exposure.',
    ['apim', 'internal', 'vnet integration', 'gateway url', 'developer portal', 'external'],
    [
      { id: 'user', type: 'user', name: 'Client' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-apim' },
      { id: 'agw-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-appgw' },
      { id: 'pip', type: 'pip', parent: 'agw-subnet', name: 'pip-agw' },
      { id: 'agw', type: 'appgw', parent: 'agw-subnet', name: 'agw-apim', fields: { sku: 'WAF_v2' } },
      { id: 'apim-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-apim' },
      { id: 'apim', type: 'api-management', parent: 'apim-subnet', name: 'apim-internal', subtitle: 'Internal VNet mode', fields: { sku: 'Premium' } },
      { id: 'backend-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-backend' },
      { id: 'backend', type: 'function-app', parent: 'backend-subnet', name: 'func-backend' },
    ],
    [
      { source: 'user', target: 'pip', kind: 'internet', label: 'HTTPS' },
      { source: 'pip', target: 'agw', kind: 'link' },
      { source: 'agw', target: 'apim', kind: 'backend', label: 'apim-internal.azure-api.net' },
      { source: 'apim', target: 'backend', kind: 'backend' },
    ]
  ),

  // =========================================================================
  // LOAD BALANCING
  // =========================================================================
  tpl(
    'standard-public-lb',
    'Standard Public Load Balancer',
    'Load Balancing',
    'Standard SKU public Load Balancer distributing to two backend VMs.',
    ['slb', 'health probe', 'backend pool', 'floating ip', 'outbound', 'snat'],
    [
      { id: 'user', type: 'user', name: 'Client' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-lb' },
      { id: 'subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-web' },
      { id: 'pip', type: 'pip', parent: 'region', name: 'pip-lb', fields: { sku: 'Standard' } },
      { id: 'lb', type: 'lb', parent: 'region', name: 'lb-public', fields: { sku: 'Standard', type: 'Public' } },
      { id: 'vm1', type: 'vm', parent: 'subnet', name: 'vm-web01' },
      { id: 'vm2', type: 'vm', parent: 'subnet', name: 'vm-web02' },
    ],
    [
      { source: 'user', target: 'pip', kind: 'internet', label: 'TCP 443' },
      { source: 'pip', target: 'lb', kind: 'link', label: 'frontend IP' },
      { source: 'lb', target: 'vm1', kind: 'backend', label: 'HTTP 80' },
      { source: 'lb', target: 'vm2', kind: 'backend', label: 'HTTP 80' },
    ]
  ),

  tpl(
    'standard-internal-lb',
    'Standard Internal Load Balancer (ILB)',
    'Load Balancing',
    'Standard SKU internal Load Balancer for backend tier — private frontend IP.',
    ['ilb', 'private frontend', 'backend tier', 'east-west'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app' },
      { id: 'web-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-web' },
      { id: 'db-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-db' },
      { id: 'vmweb1', type: 'vm', parent: 'web-subnet', name: 'vm-web01' },
      { id: 'vmweb2', type: 'vm', parent: 'web-subnet', name: 'vm-web02' },
      { id: 'ilb', type: 'lb', parent: 'db-subnet', name: 'lb-internal', fields: { sku: 'Standard', type: 'Internal', frontendIp: '10.0.2.100' } },
      { id: 'vmdb1', type: 'vm', parent: 'db-subnet', name: 'vm-db01' },
      { id: 'vmdb2', type: 'vm', parent: 'db-subnet', name: 'vm-db02' },
    ],
    [
      { source: 'vmweb1', target: 'ilb', kind: 'link', label: 'TCP 1433' },
      { source: 'vmweb2', target: 'ilb', kind: 'link', label: 'TCP 1433' },
      { source: 'ilb', target: 'vmdb1', kind: 'backend' },
      { source: 'ilb', target: 'vmdb2', kind: 'backend' },
    ]
  ),

  // =========================================================================
  // PRIVATE ENDPOINT & PRIVATE LINK
  // =========================================================================
  tpl(
    'pe-storage',
    'Private Endpoint → Storage Account',
    'Private Endpoint & Private Link',
    'Storage Account (blob) exposed via Private Endpoint with Private DNS Zone integration.',
    ['blob', 'storage private link', 'privatelink.blob.core.windows.net', 'dns'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app' },
      { id: 'pe-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-pe' },
      { id: 'pe', type: 'private-endpoint', parent: 'pe-subnet', name: 'pe-storage', fields: { targetResource: 'stcontoso', privateIp: '10.0.10.4' } },
      { id: 'wkl-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-workload' },
      { id: 'vm', type: 'vm', parent: 'wkl-subnet', name: 'vm-app01' },
      { id: 'st', type: 'storage', name: 'stcontoso', fields: { kind: 'StorageV2', sku: 'Standard_LRS' } },
      { id: 'dns', type: 'dns-zone', name: 'privatelink.blob.core.windows.net', fields: { kind: 'Private' } },
    ],
    [
      { source: 'vm', target: 'pe', kind: 'link', label: 'blob request' },
      { source: 'pe', target: 'st', kind: 'privateendpoint' },
      { source: 'pe', target: 'dns', kind: 'dns', label: 'A: stcontoso.blob…' },
      { source: 'vm', target: 'dns', kind: 'dns', label: 'DNS resolve' },
    ]
  ),

  tpl(
    'pe-sql',
    'Private Endpoint → Azure SQL',
    'Private Endpoint & Private Link',
    'Azure SQL Database exposed via Private Endpoint with private DNS.',
    ['sql', 'privatelink.database.windows.net', 'firewall rules'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app' },
      { id: 'pe-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-pe' },
      { id: 'pe', type: 'private-endpoint', parent: 'pe-subnet', name: 'pe-sql' },
      { id: 'wkl-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-workload' },
      { id: 'app', type: 'app-service', name: 'app-contoso' },
      { id: 'vm', type: 'vm', parent: 'wkl-subnet', name: 'vm-app01' },
      { id: 'sql', type: 'sql-db', name: 'sqldb-contoso' },
      { id: 'dns', type: 'dns-zone', name: 'privatelink.database.windows.net', fields: { kind: 'Private' } },
    ],
    [
      { source: 'vm', target: 'pe', kind: 'link', label: 'TCP 1433' },
      { source: 'app', target: 'pe', kind: 'link', label: 'TCP 1433' },
      { source: 'pe', target: 'sql', kind: 'privateendpoint' },
      { source: 'pe', target: 'dns', kind: 'dns' },
    ]
  ),

  tpl(
    'pe-kv',
    'Private Endpoint → Key Vault',
    'Private Endpoint & Private Link',
    'Key Vault exposed via Private Endpoint — secrets never traverse public Internet.',
    ['kv', 'privatelink.vaultcore.azure.net', 'secrets', 'certificates'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app' },
      { id: 'pe-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-pe' },
      { id: 'pe', type: 'private-endpoint', parent: 'pe-subnet', name: 'pe-kv' },
      { id: 'wkl-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-workload' },
      { id: 'vm', type: 'vm', parent: 'wkl-subnet', name: 'vm-app01' },
      { id: 'kv', type: 'key-vault', name: 'kv-contoso' },
      { id: 'dns', type: 'dns-zone', name: 'privatelink.vaultcore.azure.net', fields: { kind: 'Private' } },
    ],
    [
      { source: 'vm', target: 'pe', kind: 'link', label: 'HTTPS 443' },
      { source: 'pe', target: 'kv', kind: 'privateendpoint' },
      { source: 'pe', target: 'dns', kind: 'dns' },
    ]
  ),

  tpl(
    'private-link-service',
    'Private Link Service (custom PaaS)',
    'Private Endpoint & Private Link',
    'Expose a custom service behind Standard Internal LB as a Private Link Service consumers can connect to via Private Endpoint.',
    ['pls', 'consumer', 'provider', 'nat pool', 'alias'],
    [
      { id: 'consumer-region', type: 'group-region', name: 'Consumer VNet (East US)' },
      { id: 'consumer-vnet', type: 'group-vnet', parent: 'consumer-region', name: 'vnet-consumer' },
      { id: 'consumer-pe', type: 'private-endpoint', parent: 'consumer-vnet', name: 'pe-service' },
      { id: 'consumer-vm', type: 'vm', parent: 'consumer-vnet', name: 'vm-client' },
      { id: 'provider-region', type: 'group-region', name: 'Provider VNet (East US)' },
      { id: 'provider-vnet', type: 'group-vnet', parent: 'provider-region', name: 'vnet-provider' },
      { id: 'pls', type: 'private-link-service', parent: 'provider-vnet', name: 'pls-myservice' },
      { id: 'ilb', type: 'lb', parent: 'provider-vnet', name: 'lb-internal', fields: { sku: 'Standard', type: 'Internal' } },
      { id: 'vmss', type: 'vmss', parent: 'provider-vnet', name: 'vmss-app' },
    ],
    [
      { source: 'consumer-vm', target: 'consumer-pe', kind: 'link' },
      { source: 'consumer-pe', target: 'pls', kind: 'privateendpoint', label: 'PLS alias' },
      { source: 'pls', target: 'ilb', kind: 'link' },
      { source: 'ilb', target: 'vmss', kind: 'backend' },
    ]
  ),

  // =========================================================================
  // FIREWALL & SECURITY
  // =========================================================================
  tpl(
    'firewall-spoke-to-spoke',
    'Azure Firewall (Spoke to Spoke)',
    'Firewall & Security',
    'Azure Firewall in hub inspecting east-west traffic between spoke VNets via UDRs.',
    ['e-w', 'udr', 'next hop', 'inspection', 'rules'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'hub', type: 'group-vnet', parent: 'region', name: 'vnet-hub' },
      { id: 'fw-subnet', type: 'group-subnet', parent: 'hub', name: 'AzureFirewallSubnet' },
      { id: 'afw', type: 'firewall', parent: 'fw-subnet', name: 'afw-hub', fields: { sku: 'Standard', privateIp: '10.0.1.4' } },
      { id: 'pol', type: 'firewall-policy', name: 'afwp-hub' },
      { id: 'sp1', type: 'group-vnet', parent: 'region', name: 'vnet-spoke1', fields: { cidr: '10.1.0.0/16' } },
      { id: 'sp2', type: 'group-vnet', parent: 'region', name: 'vnet-spoke2', fields: { cidr: '10.2.0.0/16' } },
      { id: 'vm1', type: 'vm', parent: 'sp1', name: 'vm-app' },
      { id: 'vm2', type: 'vm', parent: 'sp2', name: 'vm-db' },
      { id: 'udr1', type: 'udr', name: 'rt-spoke1', notes: '10.2.0.0/16 next hop = 10.0.1.4' },
      { id: 'udr2', type: 'udr', name: 'rt-spoke2', notes: '10.1.0.0/16 next hop = 10.0.1.4' },
    ],
    [
      { source: 'afw', target: 'pol', kind: 'link' },
      { source: 'hub', target: 'sp1', kind: 'peering' },
      { source: 'hub', target: 'sp2', kind: 'peering' },
      { source: 'vm1', target: 'afw', kind: 'link', label: 'e-w traffic' },
      { source: 'afw', target: 'vm2', kind: 'link' },
      { source: 'udr1', target: 'sp1', kind: 'link' },
      { source: 'udr2', target: 'sp2', kind: 'link' },
    ]
  ),

  tpl(
    'firewall-premium-tls',
    'Azure Firewall Premium (TLS Inspection + IDPS)',
    'Firewall & Security',
    'Azure Firewall Premium performing TLS inspection with intermediate CA in Key Vault.',
    ['tls inspection', 'idps', 'url filtering', 'ca', 'intermediate certificate'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'hub', type: 'group-vnet', parent: 'region', name: 'vnet-hub' },
      { id: 'fw-subnet', type: 'group-subnet', parent: 'hub', name: 'AzureFirewallSubnet' },
      { id: 'afw', type: 'firewall', parent: 'fw-subnet', name: 'afw-premium', fields: { sku: 'Premium' } },
      { id: 'pol', type: 'firewall-policy', name: 'afwp-premium', notes: 'TLS inspection enabled' },
      { id: 'kv', type: 'key-vault', name: 'kv-fw', notes: 'Holds intermediate CA' },
      { id: 'spoke', type: 'group-vnet', parent: 'region', name: 'vnet-spoke' },
      { id: 'vm', type: 'vm', parent: 'spoke', name: 'vm-workload' },
      { id: 'internet', type: 'internet', name: 'Internet destination' },
    ],
    [
      { source: 'afw', target: 'pol', kind: 'link' },
      { source: 'pol', target: 'kv', kind: 'link', label: 'CA cert' },
      { source: 'vm', target: 'afw', kind: 'link', label: 'egress' },
      { source: 'afw', target: 'internet', kind: 'internet', label: 'TLS decrypt + re-encrypt' },
    ]
  ),

  tpl(
    'firewall-forced-tunneling',
    'Firewall + Forced Tunneling to On-prem',
    'Firewall & Security',
    'All Azure egress forced through on-prem via ExpressRoute + UDR (0.0.0.0/0 next hop = VPN/ER GW).',
    ['forced tunneling', 'egress inspection', 'on-prem gateway', 'udr default route'],
    [
      { id: 'onprem', type: 'group-onprem', name: 'On-premises' },
      { id: 'op-fw', type: 'nva', parent: 'onprem', name: 'On-prem firewall' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-hub' },
      { id: 'gw-subnet', type: 'group-subnet', parent: 'vnet', name: 'GatewaySubnet' },
      { id: 'ergw', type: 'er-gw', parent: 'gw-subnet', name: 'ergw-hub' },
      { id: 'fw-subnet', type: 'group-subnet', parent: 'vnet', name: 'AzureFirewallSubnet' },
      { id: 'afw', type: 'firewall', parent: 'fw-subnet', name: 'afw-hub' },
      { id: 'wkl-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-workload' },
      { id: 'vm', type: 'vm', parent: 'wkl-subnet', name: 'vm-workload' },
      { id: 'udr', type: 'udr', name: 'rt-forced-tunnel', notes: '0.0.0.0/0 next hop = 10.0.1.4 (AFW); advertise to on-prem via BGP' },
    ],
    [
      { source: 'vm', target: 'afw', kind: 'link' },
      { source: 'afw', target: 'ergw', kind: 'link', label: '0.0.0.0/0' },
      { source: 'ergw', target: 'op-fw', kind: 'expressroute' },
      { source: 'udr', target: 'wkl-subnet', kind: 'link' },
    ]
  ),

  tpl(
    'nsg-asg-segmentation',
    'NSG + ASG Segmentation',
    'Firewall & Security',
    'Application Security Groups grouped by workload role; NSG rules reference ASGs instead of IPs.',
    ['micro-segmentation', 'nsg rules', 'source/destination', 'zero trust'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app' },
      { id: 'web-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-web' },
      { id: 'app-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-app' },
      { id: 'db-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-db' },
      { id: 'nsg-web', type: 'nsg', name: 'nsg-web' },
      { id: 'nsg-app', type: 'nsg', name: 'nsg-app' },
      { id: 'nsg-db', type: 'nsg', name: 'nsg-db' },
      { id: 'asg-web', type: 'asg', name: 'asg-web' },
      { id: 'asg-app', type: 'asg', name: 'asg-app' },
      { id: 'asg-db', type: 'asg', name: 'asg-db' },
      { id: 'vm-web', type: 'vm', parent: 'web-subnet', name: 'vm-web01' },
      { id: 'vm-app', type: 'vm', parent: 'app-subnet', name: 'vm-app01' },
      { id: 'vm-db', type: 'vm', parent: 'db-subnet', name: 'vm-db01' },
    ],
    [
      { source: 'nsg-web', target: 'web-subnet', kind: 'link' },
      { source: 'nsg-app', target: 'app-subnet', kind: 'link' },
      { source: 'nsg-db', target: 'db-subnet', kind: 'link' },
      { source: 'asg-web', target: 'vm-web', kind: 'link' },
      { source: 'asg-app', target: 'vm-app', kind: 'link' },
      { source: 'asg-db', target: 'vm-db', kind: 'link' },
      { source: 'vm-web', target: 'vm-app', kind: 'link', label: 'asg-web -> asg-app' },
      { source: 'vm-app', target: 'vm-db', kind: 'link', label: 'asg-app -> asg-db' },
    ]
  ),

  tpl(
    'ddos-standard',
    'DDoS Protection Standard',
    'Firewall & Security',
    'DDoS Protection Standard plan applied to a VNet with public endpoints (AppGW + PIPs).',
    ['ddos', 'protected pips', 'network protection', 'ip protection'],
    [
      { id: 'ddos', type: 'ddos-plan', name: 'ddos-plan-01' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app', notes: 'DDoS Standard enabled' },
      { id: 'agw-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-appgw' },
      { id: 'pip1', type: 'pip', parent: 'agw-subnet', name: 'pip-agw' },
      { id: 'agw', type: 'appgw', parent: 'agw-subnet', name: 'agw-web' },
      { id: 'wkl-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-web' },
      { id: 'vmss', type: 'vmss', parent: 'wkl-subnet', name: 'vmss-web' },
    ],
    [
      { source: 'ddos', target: 'vnet', kind: 'link', label: 'protects' },
      { source: 'pip1', target: 'agw', kind: 'link' },
      { source: 'agw', target: 'vmss', kind: 'backend' },
    ]
  ),

  // =========================================================================
  // DNS
  // =========================================================================
  tpl(
    'dns-private-resolver',
    'DNS Private Resolver',
    'DNS',
    'DNS Private Resolver with inbound + outbound endpoints for hybrid DNS resolution to on-prem.',
    ['dns forwarding', 'conditional forwarder', 'ruleset', 'inbound endpoint', 'outbound endpoint'],
    [
      { id: 'onprem', type: 'group-onprem', name: 'On-premises' },
      { id: 'onprem-dns', type: 'nva', parent: 'onprem', name: 'On-prem DNS server' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-dns' },
      { id: 'in-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-dnspr-in' },
      { id: 'out-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-dnspr-out' },
      { id: 'wkl-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-workload' },
      { id: 'dnspr', type: 'dns-resolver', parent: 'vnet', name: 'dnspr-hub' },
      { id: 'vm', type: 'vm', parent: 'wkl-subnet', name: 'vm-app01' },
      { id: 'pdns', type: 'dns-zone', name: 'contoso.internal', fields: { kind: 'Private' } },
    ],
    [
      { source: 'vm', target: 'dnspr', kind: 'dns', label: 'DNS query' },
      { source: 'dnspr', target: 'pdns', kind: 'dns', label: 'private zone' },
      { source: 'dnspr', target: 'onprem-dns', kind: 'dns', label: 'outbound forward' },
      { source: 'onprem-dns', target: 'dnspr', kind: 'dns', label: 'inbound query' },
    ]
  ),

  tpl(
    'private-dns-zone-pe',
    'Private DNS Zone (Private Endpoint DNS)',
    'DNS',
    'Private DNS Zone linked to VNet for automatic name resolution of Private Endpoints.',
    ['privatelink zone', 'zone group', 'auto-registration', 'a record'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app' },
      { id: 'pe-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-pe' },
      { id: 'pe', type: 'private-endpoint', parent: 'pe-subnet', name: 'pe-storage' },
      { id: 'wkl-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-workload' },
      { id: 'vm', type: 'vm', parent: 'wkl-subnet', name: 'vm-app01' },
      { id: 'zone', type: 'dns-zone', name: 'privatelink.blob.core.windows.net', fields: { kind: 'Private' } },
      { id: 'storage', type: 'storage', name: 'stcontoso' },
    ],
    [
      { source: 'zone', target: 'vnet', kind: 'link', label: 'VNet link' },
      { source: 'pe', target: 'zone', kind: 'dns', label: 'A: stcontoso' },
      { source: 'vm', target: 'zone', kind: 'dns', label: 'resolve' },
      { source: 'pe', target: 'storage', kind: 'privateendpoint' },
    ]
  ),

  // =========================================================================
  // NAT & Egress
  // =========================================================================
  tpl(
    'nat-gateway-outbound',
    'NAT Gateway (Outbound Egress)',
    'NAT & Egress',
    'NAT Gateway providing deterministic, high-scale SNAT for a subnet — no SNAT port exhaustion.',
    ['snat', 'port exhaustion', 'outbound', 'egress ip', 'idle timeout'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app' },
      { id: 'subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-workload' },
      { id: 'nat', type: 'nat', name: 'natgw-outbound' },
      { id: 'pip', type: 'pip', name: 'pip-natgw', fields: { sku: 'Standard', assignment: 'Static' } },
      { id: 'vm1', type: 'vm', parent: 'subnet', name: 'vm-app01' },
      { id: 'vm2', type: 'vm', parent: 'subnet', name: 'vm-app02' },
      { id: 'internet', type: 'internet', name: 'Internet' },
    ],
    [
      { source: 'nat', target: 'pip', kind: 'link' },
      { source: 'subnet', target: 'nat', kind: 'link', label: 'associated' },
      { source: 'vm1', target: 'nat', kind: 'link' },
      { source: 'vm2', target: 'nat', kind: 'link' },
      { source: 'nat', target: 'internet', kind: 'internet', label: 'SNAT' },
    ]
  ),

  // =========================================================================
  // REMOTE ACCESS
  // =========================================================================
  tpl(
    'bastion-jumpbox',
    'Bastion + Jumpbox',
    'Remote Access',
    'Azure Bastion for RDP/SSH — no public IP on VMs; users connect through browser.',
    ['no public ip', 'browser rdp', 'ssh', 'jit', 'sku standard'],
    [
      { id: 'user', type: 'user', name: 'Admin' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app' },
      { id: 'bs-subnet', type: 'group-subnet', parent: 'vnet', name: 'AzureBastionSubnet' },
      { id: 'pip', type: 'pip', parent: 'bs-subnet', name: 'pip-bastion', fields: { sku: 'Standard' } },
      { id: 'bastion', type: 'bastion', parent: 'bs-subnet', name: 'bastion-hub' },
      { id: 'wkl-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-workload' },
      { id: 'vm1', type: 'vm', parent: 'wkl-subnet', name: 'vm-app01' },
      { id: 'vm2', type: 'vm', parent: 'wkl-subnet', name: 'vm-app02' },
    ],
    [
      { source: 'user', target: 'pip', kind: 'internet', label: 'HTTPS 443' },
      { source: 'pip', target: 'bastion', kind: 'link' },
      { source: 'bastion', target: 'vm1', kind: 'link', label: 'RDP/SSH' },
      { source: 'bastion', target: 'vm2', kind: 'link', label: 'RDP/SSH' },
    ]
  ),

  // =========================================================================
  // KUBERNETES
  // =========================================================================
  tpl(
    'aks-private-cluster',
    'AKS Private Cluster',
    'Kubernetes',
    'AKS with private API server — accessed through Private Endpoint, no public control plane.',
    ['private api server', 'private link', 'kubectl', 'authorized ip ranges'],
    [
      { id: 'user', type: 'user', name: 'Cluster admin' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'hub', type: 'group-vnet', parent: 'region', name: 'vnet-hub' },
      { id: 'jump-subnet', type: 'group-subnet', parent: 'hub', name: 'snet-jump' },
      { id: 'jump', type: 'vm', parent: 'jump-subnet', name: 'vm-jump' },
      { id: 'spoke', type: 'group-vnet', parent: 'region', name: 'vnet-aks' },
      { id: 'aks-subnet', type: 'group-subnet', parent: 'spoke', name: 'snet-aks' },
      { id: 'aks', type: 'aks', parent: 'aks-subnet', name: 'aks-private', subtitle: 'Private cluster' },
      { id: 'pe', type: 'private-endpoint', parent: 'aks-subnet', name: 'pe-aks-api' },
      { id: 'dns', type: 'dns-zone', name: 'privatelink.eastus.azmk8s.io', fields: { kind: 'Private' } },
    ],
    [
      { source: 'hub', target: 'spoke', kind: 'peering' },
      { source: 'user', target: 'jump', kind: 'link', label: 'kubectl' },
      { source: 'jump', target: 'pe', kind: 'link', label: 'API 443' },
      { source: 'pe', target: 'aks', kind: 'privateendpoint' },
      { source: 'pe', target: 'dns', kind: 'dns' },
    ]
  ),

  tpl(
    'aks-agic',
    'AKS + App Gateway Ingress (AGIC)',
    'Kubernetes',
    'AKS with Application Gateway Ingress Controller — AppGW is the ingress instead of nginx.',
    ['agic', 'ingress controller', 'k8s ingress', 'wafv2', 'backend pool'],
    [
      { id: 'user', type: 'user', name: 'Client' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-aks' },
      { id: 'agw-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-appgw' },
      { id: 'pip', type: 'pip', parent: 'agw-subnet', name: 'pip-agw' },
      { id: 'agw', type: 'appgw', parent: 'agw-subnet', name: 'agw-ingress', fields: { sku: 'WAF_v2' } },
      { id: 'aks-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-aks' },
      { id: 'aks', type: 'aks', parent: 'aks-subnet', name: 'aks-cluster' },
    ],
    [
      { source: 'user', target: 'pip', kind: 'internet', label: 'HTTPS' },
      { source: 'pip', target: 'agw', kind: 'link' },
      { source: 'agw', target: 'aks', kind: 'backend', label: 'pod IPs' },
    ]
  ),

  // =========================================================================
  // SEGMENTATION & ROUTING
  // =========================================================================
  tpl(
    'udr-nva',
    'UDR + NVA (Custom Routing)',
    'Segmentation & Routing',
    'Custom Network Virtual Appliance (Fortinet/Palo Alto) with UDR sending traffic through it.',
    ['user defined route', 'nva', 'firewall appliance', 'ha ports', 'ip forwarding'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-hub' },
      { id: 'nva-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-nva' },
      { id: 'nva', type: 'nva', parent: 'nva-subnet', name: 'nva-fortigate', fields: { vendor: 'Fortinet', model: 'FortiGate' } },
      { id: 'nva-pip', type: 'pip', parent: 'nva-subnet', name: 'pip-nva' },
      { id: 'ilb', type: 'lb', parent: 'nva-subnet', name: 'lb-nva-ha', fields: { sku: 'Standard', type: 'Internal' } },
      { id: 'wkl-subnet', type: 'group-subnet', parent: 'vnet', name: 'snet-workload' },
      { id: 'vm', type: 'vm', parent: 'wkl-subnet', name: 'vm-workload' },
      { id: 'udr', type: 'udr', name: 'rt-workload', notes: '0.0.0.0/0 next hop = 10.0.1.10 (NVA)' },
      { id: 'internet', type: 'internet', name: 'Internet' },
    ],
    [
      { source: 'udr', target: 'wkl-subnet', kind: 'link' },
      { source: 'vm', target: 'nva', kind: 'link', label: 'via UDR' },
      { source: 'nva', target: 'internet', kind: 'internet' },
      { source: 'nva', target: 'ilb', kind: 'link', label: 'HA' },
      { source: 'nva', target: 'nva-pip', kind: 'link' },
    ]
  ),

  // =========================================================================
  // MORE HYBRID CONNECTIVITY (MS Learn / product docs)
  // =========================================================================
  tpl(
    'vpn-active-active',
    'VPN Gateway Active-Active (HA)',
    'Hybrid Connectivity',
    'Active-active VPN gateway with 2 public IPs and 2 tunnels for maximum tunnel uptime.',
    ['ha', 'active active', 'redundant', 'two tunnels', 'aggregate throughput'],
    [
      { id: 'onprem', type: 'group-onprem', name: 'On-premises HQ' },
      { id: 'onprem-fw', type: 'nva', parent: 'onprem', name: 'VPN device', subtitle: '2 tunnels' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-hub' },
      { id: 'gw-subnet', type: 'group-subnet', parent: 'vnet', name: 'GatewaySubnet' },
      { id: 'pip1', type: 'pip', parent: 'gw-subnet', name: 'pip-vpngw-1' },
      { id: 'pip2', type: 'pip', parent: 'gw-subnet', name: 'pip-vpngw-2' },
      { id: 'vpngw', type: 'vpn-gw', parent: 'gw-subnet', name: 'vpngw-hub', subtitle: 'Active-Active', fields: { sku: 'VpnGw2', mode: 'Active-Active', asn: '65515' } },
      { id: 'lng', type: 'local-gw', name: 'lng-onprem' },
      { id: 'conn1', type: 'connection', name: 'conn-tunnel-1', fields: { protocol: 'IKEv2' } },
      { id: 'conn2', type: 'connection', name: 'conn-tunnel-2', fields: { protocol: 'IKEv2' } },
    ],
    [
      { source: 'onprem-fw', target: 'pip1', kind: 'vpn', label: 'Tunnel 1' },
      { source: 'onprem-fw', target: 'pip2', kind: 'vpn', label: 'Tunnel 2' },
      { source: 'pip1', target: 'vpngw' }, { source: 'pip2', target: 'vpngw' },
      { source: 'vpngw', target: 'conn1' }, { source: 'vpngw', target: 'conn2' },
      { source: 'conn1', target: 'lng' }, { source: 'conn2', target: 'lng' },
    ]
  ),

  tpl(
    'vpn-multi-site',
    'Multi-site VPN Gateway',
    'Hybrid Connectivity',
    'Single VPN Gateway connects to multiple on-premises sites via separate Local Network Gateways.',
    ['multi-site', 'branch', 'multiple sites', 'many tunnels', 'local network gateway'],
    [
      { id: 'branch1', type: 'group-onprem', name: 'Branch A' },
      { id: 'br1-fw', type: 'nva', parent: 'branch1', name: 'VPN device A' },
      { id: 'branch2', type: 'group-onprem', name: 'Branch B' },
      { id: 'br2-fw', type: 'nva', parent: 'branch2', name: 'VPN device B' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-hub' },
      { id: 'gw-subnet', type: 'group-subnet', parent: 'vnet', name: 'GatewaySubnet' },
      { id: 'vpngw', type: 'vpn-gw', parent: 'gw-subnet', name: 'vpngw-hub', fields: { sku: 'VpnGw2', type: 'RouteBased' } },
      { id: 'lng-a', type: 'local-gw', name: 'lng-branch-a', fields: { addressSpace: '192.168.10.0/24' } },
      { id: 'lng-b', type: 'local-gw', name: 'lng-branch-b', fields: { addressSpace: '192.168.20.0/24' } },
    ],
    [
      { source: 'br1-fw', target: 'vpngw', kind: 'vpn', label: 'Tunnel A' },
      { source: 'br2-fw', target: 'vpngw', kind: 'vpn', label: 'Tunnel B' },
      { source: 'vpngw', target: 'lng-a' }, { source: 'vpngw', target: 'lng-b' },
    ]
  ),

  tpl(
    'er-global-reach',
    'ExpressRoute Global Reach',
    'Hybrid Connectivity',
    'Global Reach lets 2 on-prem sites talk across the Microsoft backbone via their ExpressRoute circuits.',
    ['global reach', 'branch to branch', 'inter-region', 'circuit peering', 'private peering'],
    [
      { id: 'onprem-a', type: 'group-onprem', name: 'Site A (US)' },
      { id: 'onprem-b', type: 'group-onprem', name: 'Site B (EU)' },
      { id: 'circuit-a', type: 'er-circuit', name: 'ER Circuit A', fields: { peeringLocation: 'Washington DC', bandwidth: '1 Gbps' } },
      { id: 'circuit-b', type: 'er-circuit', name: 'ER Circuit B', fields: { peeringLocation: 'Amsterdam', bandwidth: '1 Gbps' } },
      { id: 'region-a', type: 'group-region', name: 'East US' },
      { id: 'vnet-a', type: 'group-vnet', parent: 'region-a', name: 'vnet-us' },
      { id: 'gw-a', type: 'group-subnet', parent: 'vnet-a', name: 'GatewaySubnet' },
      { id: 'ergw-a', type: 'er-gw', parent: 'gw-a', name: 'ergw-us' },
      { id: 'region-b', type: 'group-region', name: 'West Europe' },
      { id: 'vnet-b', type: 'group-vnet', parent: 'region-b', name: 'vnet-eu' },
      { id: 'gw-b', type: 'group-subnet', parent: 'vnet-b', name: 'GatewaySubnet' },
      { id: 'ergw-b', type: 'er-gw', parent: 'gw-b', name: 'ergw-eu' },
    ],
    [
      { source: 'onprem-a', target: 'circuit-a', kind: 'expressroute' },
      { source: 'onprem-b', target: 'circuit-b', kind: 'expressroute' },
      { source: 'circuit-a', target: 'ergw-a', kind: 'expressroute' },
      { source: 'circuit-b', target: 'ergw-b', kind: 'expressroute' },
      { source: 'circuit-a', target: 'circuit-b', kind: 'expressroute', label: 'Global Reach' },
    ]
  ),

  tpl(
    'er-direct',
    'ExpressRoute Direct (100 Gbps)',
    'Hybrid Connectivity',
    'Direct connection at 100 Gbps port pair — customer owns the physical layer at MSFT edge.',
    ['expressroute direct', '100gbps', 'port pair', 'megaport', 'meet-me'],
    [
      { id: 'onprem', type: 'group-onprem', name: 'Customer edge' },
      { id: 'onprem-router', type: 'nva', parent: 'onprem', name: 'Edge router', subtitle: '100G ports' },
      { id: 'er-direct', type: 'er-circuit', name: 'ER Direct port pair', fields: { bandwidth: '100 Gbps', sku: 'ExpressRoute Direct' } },
      { id: 'circuit', type: 'er-circuit', name: 'ER Circuit (on port)', fields: { bandwidth: '10 Gbps' } },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-hub' },
      { id: 'gw-subnet', type: 'group-subnet', parent: 'vnet', name: 'GatewaySubnet' },
      { id: 'ergw', type: 'er-gw', parent: 'gw-subnet', name: 'ergw-hub', fields: { sku: 'ErGw3AZ' } },
    ],
    [
      { source: 'onprem-router', target: 'er-direct', kind: 'expressroute' },
      { source: 'er-direct', target: 'circuit', kind: 'expressroute' },
      { source: 'circuit', target: 'ergw', kind: 'expressroute' },
    ]
  ),

  tpl(
    'vpn-over-er',
    'VPN over ExpressRoute (encryption)',
    'Hybrid Connectivity',
    'IPsec S2S VPN tunneled through ExpressRoute Private Peering — encrypts private-peering traffic.',
    ['ipsec over er', 'encrypted expressroute', 'compliance', 'macsec alternative'],
    [
      { id: 'onprem', type: 'group-onprem', name: 'Data center' },
      { id: 'onprem-fw', type: 'nva', parent: 'onprem', name: 'VPN device' },
      { id: 'circuit', type: 'er-circuit', name: 'ER Circuit', fields: { peering: 'Private' } },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-hub' },
      { id: 'gw-subnet', type: 'group-subnet', parent: 'vnet', name: 'GatewaySubnet' },
      { id: 'vpngw', type: 'vpn-gw', parent: 'gw-subnet', name: 'vpngw-hub', subtitle: 'IPsec over ER' },
      { id: 'ergw', type: 'er-gw', parent: 'gw-subnet', name: 'ergw-hub' },
    ],
    [
      { source: 'onprem-fw', target: 'circuit', kind: 'expressroute' },
      { source: 'circuit', target: 'ergw', kind: 'expressroute', label: 'Private peering' },
      { source: 'onprem-fw', target: 'vpngw', kind: 'vpn', label: 'IPsec over private peering' },
    ]
  ),

  // =========================================================================
  // MORE HUB & SPOKE (CAF, multi-region, landing zones)
  // =========================================================================
  tpl(
    'hub-spoke-caf',
    'CAF Hub & Spoke (recommended)',
    'Hub & Spoke',
    'Cloud Adoption Framework hub-spoke: hub with Firewall/Bastion/VPN GW + 2 production spokes.',
    ['caf', 'cloud adoption framework', 'reference architecture', 'canonical', 'landing zone'],
    [
      { id: 'onprem', type: 'group-onprem', name: 'Cross-premises' },
      { id: 'onprem-vm', type: 'vm', parent: 'onprem', name: 'On-prem workload' },
      { id: 'onprem-gw', type: 'nva', parent: 'onprem', name: 'On-prem GW' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'hub', type: 'group-vnet', parent: 'region', name: 'vnet-hub', fields: { cidr: '10.0.0.0/22' } },
      { id: 'gw-subnet', type: 'group-subnet', parent: 'hub', name: 'GatewaySubnet' },
      { id: 'vpngw', type: 'vpn-gw', parent: 'gw-subnet', name: 'vpngw-hub' },
      { id: 'fw-subnet', type: 'group-subnet', parent: 'hub', name: 'AzureFirewallSubnet' },
      { id: 'fw', type: 'firewall', parent: 'fw-subnet', name: 'afw-hub' },
      { id: 'bastion-subnet', type: 'group-subnet', parent: 'hub', name: 'AzureBastionSubnet' },
      { id: 'bastion', type: 'bastion', parent: 'bastion-subnet', name: 'bastion-hub' },
      { id: 'spoke1', type: 'group-vnet', parent: 'region', name: 'vnet-prod-spoke1', fields: { cidr: '10.1.0.0/16' } },
      { id: 's1-subnet', type: 'group-subnet', parent: 'spoke1', name: 'snet-workload' },
      { id: 's1-vm1', type: 'vm', parent: 's1-subnet', name: 'vm-prod-1' },
      { id: 's1-vm2', type: 'vm', parent: 's1-subnet', name: 'vm-prod-2' },
      { id: 'spoke2', type: 'group-vnet', parent: 'region', name: 'vnet-prod-spoke2', fields: { cidr: '10.2.0.0/16' } },
      { id: 's2-subnet', type: 'group-subnet', parent: 'spoke2', name: 'snet-workload' },
      { id: 's2-vm1', type: 'vm', parent: 's2-subnet', name: 'vm-prod-3' },
      { id: 'monitor', type: 'network-watcher', name: 'Azure Monitor' },
    ],
    [
      { source: 'onprem-gw', target: 'vpngw', kind: 'vpn' },
      { source: 'hub', target: 'spoke1', kind: 'peering' },
      { source: 'hub', target: 'spoke2', kind: 'peering' },
      { source: 's1-subnet', target: 'fw', kind: 'link', label: 'Forced tunnel (UDR)' },
      { source: 's2-subnet', target: 'fw', kind: 'link', label: 'Forced tunnel (UDR)' },
      { source: 'fw', target: 'monitor', kind: 'link', label: 'Diagnostics' },
    ]
  ),

  tpl(
    'hub-spoke-multi-region',
    'Multi-region Hub & Spoke',
    'Hub & Spoke',
    'Two regional hubs peered globally, each hub has its own spokes — DR-ready topology.',
    ['multi region', 'global peering', 'geo-redundant', 'active-active hubs', 'dr'],
    [
      { id: 'region-a', type: 'group-region', name: 'East US' },
      { id: 'hub-a', type: 'group-vnet', parent: 'region-a', name: 'vnet-hub-eus' },
      { id: 'fwsub-a', type: 'group-subnet', parent: 'hub-a', name: 'AzureFirewallSubnet' },
      { id: 'fw-a', type: 'firewall', parent: 'fwsub-a', name: 'afw-eus' },
      { id: 'spoke-a1', type: 'group-vnet', parent: 'region-a', name: 'vnet-spoke-eus-1' },
      { id: 'sa1-sub', type: 'group-subnet', parent: 'spoke-a1', name: 'snet-workload' },
      { id: 'sa1-vm', type: 'vm', parent: 'sa1-sub', name: 'vm-eus' },
      { id: 'region-b', type: 'group-region', name: 'West US' },
      { id: 'hub-b', type: 'group-vnet', parent: 'region-b', name: 'vnet-hub-wus' },
      { id: 'fwsub-b', type: 'group-subnet', parent: 'hub-b', name: 'AzureFirewallSubnet' },
      { id: 'fw-b', type: 'firewall', parent: 'fwsub-b', name: 'afw-wus' },
      { id: 'spoke-b1', type: 'group-vnet', parent: 'region-b', name: 'vnet-spoke-wus-1' },
      { id: 'sb1-sub', type: 'group-subnet', parent: 'spoke-b1', name: 'snet-workload' },
      { id: 'sb1-vm', type: 'vm', parent: 'sb1-sub', name: 'vm-wus' },
    ],
    [
      { source: 'hub-a', target: 'spoke-a1', kind: 'peering' },
      { source: 'hub-b', target: 'spoke-b1', kind: 'peering' },
      { source: 'hub-a', target: 'hub-b', kind: 'peering', label: 'Global VNet peering' },
    ]
  ),

  tpl(
    'landing-zone-connectivity',
    'Enterprise Landing Zone (Connectivity sub)',
    'Hub & Spoke',
    'CAF Enterprise-Scale Connectivity subscription: hub with FW/VPN/ER + separate management sub.',
    ['enterprise scale', 'caf', 'landing zone', 'management group', 'connectivity subscription'],
    [
      { id: 'sub-conn', type: 'group-subscription', name: 'Connectivity subscription' },
      { id: 'region', type: 'group-region', parent: 'sub-conn', name: 'East US' },
      { id: 'hub', type: 'group-vnet', parent: 'region', name: 'vnet-hub' },
      { id: 'fw-sub', type: 'group-subnet', parent: 'hub', name: 'AzureFirewallSubnet' },
      { id: 'fw', type: 'firewall', parent: 'fw-sub', name: 'afw-hub' },
      { id: 'gw-sub', type: 'group-subnet', parent: 'hub', name: 'GatewaySubnet' },
      { id: 'ergw', type: 'er-gw', parent: 'gw-sub', name: 'ergw-hub' },
      { id: 'vpngw', type: 'vpn-gw', parent: 'gw-sub', name: 'vpngw-hub' },
      { id: 'sub-lz1', type: 'group-subscription', name: 'Landing zone: Corp' },
      { id: 'lz1-region', type: 'group-region', parent: 'sub-lz1', name: 'East US' },
      { id: 'lz1-vnet', type: 'group-vnet', parent: 'lz1-region', name: 'vnet-corp' },
      { id: 'lz1-sub', type: 'group-subnet', parent: 'lz1-vnet', name: 'snet-workload' },
      { id: 'lz1-vm', type: 'vm', parent: 'lz1-sub', name: 'vm-corp' },
    ],
    [
      { source: 'hub', target: 'lz1-vnet', kind: 'peering', label: 'LZ peering' },
      { source: 'lz1-sub', target: 'fw', kind: 'link', label: 'Egress via FW' },
    ]
  ),

  // =========================================================================
  // VIRTUAL WAN (from MS Learn hub-spoke-vwan and vWAN docs)
  // =========================================================================
  tpl(
    'vwan-site-vpn',
    'Virtual WAN + Site-to-Site VPN',
    'Virtual WAN',
    'Virtual WAN hub with S2S VPN branches — Microsoft-managed hub replaces DIY hub.',
    ['virtual wan', 'vpn site', 'branch', 'sd-wan', 'microsoft managed hub'],
    [
      { id: 'branch1', type: 'group-onprem', name: 'Branch A (VPN Site)' },
      { id: 'br1-fw', type: 'nva', parent: 'branch1', name: 'Branch A device' },
      { id: 'branch2', type: 'group-onprem', name: 'Branch B (VPN Site)' },
      { id: 'br2-fw', type: 'nva', parent: 'branch2', name: 'Branch B device' },
      { id: 'vwan', type: 'vwan', name: 'vwan-global' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'hub', type: 'vwan-hub', parent: 'region', name: 'vhub-eus', subtitle: 'VPN gateway inside' },
      { id: 'spoke', type: 'group-vnet', parent: 'region', name: 'vnet-spoke' },
      { id: 'spoke-sub', type: 'group-subnet', parent: 'spoke', name: 'snet-workload' },
      { id: 'spoke-vm', type: 'vm', parent: 'spoke-sub', name: 'vm-workload' },
    ],
    [
      { source: 'br1-fw', target: 'hub', kind: 'vpn', label: 'Site A' },
      { source: 'br2-fw', target: 'hub', kind: 'vpn', label: 'Site B' },
      { source: 'vwan', target: 'hub' },
      { source: 'hub', target: 'spoke', kind: 'peering', label: 'vWAN connection' },
    ]
  ),

  tpl(
    'vwan-user-vpn',
    'Virtual WAN + User VPN (P2S)',
    'Virtual WAN',
    'Virtual WAN hub with User VPN gateway — remote users connect P2S to the vHub.',
    ['user vpn', 'p2s', 'remote worker', 'openvpn', 'aad auth'],
    [
      { id: 'users', type: 'user', name: 'Remote users' },
      { id: 'vwan', type: 'vwan', name: 'vwan-global' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'hub', type: 'vwan-hub', parent: 'region', name: 'vhub-eus', subtitle: 'User VPN GW' },
      { id: 'spoke', type: 'group-vnet', parent: 'region', name: 'vnet-spoke' },
      { id: 'spoke-sub', type: 'group-subnet', parent: 'spoke', name: 'snet-workload' },
      { id: 'spoke-vm', type: 'vm', parent: 'spoke-sub', name: 'vm-app' },
    ],
    [
      { source: 'users', target: 'hub', kind: 'vpn', label: 'OpenVPN/IKEv2' },
      { source: 'vwan', target: 'hub' },
      { source: 'hub', target: 'spoke', kind: 'peering' },
    ]
  ),

  tpl(
    'vwan-expressroute',
    'Virtual WAN + ExpressRoute',
    'Virtual WAN',
    'vWAN hub with ExpressRoute gateway — enterprise MPLS attach into Microsoft-managed hub.',
    ['vwan er', 'expressroute vwan', 'circuit', 'mpls', 'enterprise'],
    [
      { id: 'onprem', type: 'group-onprem', name: 'Datacenter' },
      { id: 'onprem-rt', type: 'nva', parent: 'onprem', name: 'MPLS edge' },
      { id: 'circuit', type: 'er-circuit', name: 'ER Circuit' },
      { id: 'vwan', type: 'vwan', name: 'vwan-global' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'hub', type: 'vwan-hub', parent: 'region', name: 'vhub-eus', subtitle: 'ER gateway inside' },
      { id: 'spoke', type: 'group-vnet', parent: 'region', name: 'vnet-spoke' },
      { id: 'spoke-sub', type: 'group-subnet', parent: 'spoke', name: 'snet-workload' },
      { id: 'spoke-vm', type: 'vm', parent: 'spoke-sub', name: 'vm-app' },
    ],
    [
      { source: 'onprem-rt', target: 'circuit', kind: 'expressroute' },
      { source: 'circuit', target: 'hub', kind: 'expressroute' },
      { source: 'vwan', target: 'hub' },
      { source: 'hub', target: 'spoke', kind: 'peering' },
    ]
  ),

  tpl(
    'vwan-multi-hub',
    'Virtual WAN Any-to-Any (multi-hub)',
    'Virtual WAN',
    'Two regional vWAN hubs — Microsoft mesh routing between hubs (any-to-any).',
    ['multi hub', 'any to any', 'transit', 'hub to hub', 'global mesh'],
    [
      { id: 'vwan', type: 'vwan', name: 'vwan-global' },
      { id: 'region-a', type: 'group-region', name: 'East US' },
      { id: 'hub-a', type: 'vwan-hub', parent: 'region-a', name: 'vhub-eus' },
      { id: 'spoke-a', type: 'group-vnet', parent: 'region-a', name: 'vnet-eus' },
      { id: 'sa-sub', type: 'group-subnet', parent: 'spoke-a', name: 'snet-app' },
      { id: 'sa-vm', type: 'vm', parent: 'sa-sub', name: 'vm-eus' },
      { id: 'region-b', type: 'group-region', name: 'West Europe' },
      { id: 'hub-b', type: 'vwan-hub', parent: 'region-b', name: 'vhub-weu' },
      { id: 'spoke-b', type: 'group-vnet', parent: 'region-b', name: 'vnet-weu' },
      { id: 'sb-sub', type: 'group-subnet', parent: 'spoke-b', name: 'snet-app' },
      { id: 'sb-vm', type: 'vm', parent: 'sb-sub', name: 'vm-weu' },
    ],
    [
      { source: 'vwan', target: 'hub-a' }, { source: 'vwan', target: 'hub-b' },
      { source: 'hub-a', target: 'spoke-a', kind: 'peering' },
      { source: 'hub-b', target: 'spoke-b', kind: 'peering' },
      { source: 'hub-a', target: 'hub-b', kind: 'peering', label: 'Hub-to-hub (MSFT)' },
    ]
  ),

  // =========================================================================
  // MORE APPLICATION DELIVERY
  // =========================================================================
  tpl(
    'appgw-mtls',
    'App Gateway Mutual Authentication (mTLS)',
    'Application Delivery',
    'AppGW v2 with mTLS — client cert validated at gateway using uploaded client CA certs.',
    ['mutual auth', 'mtls', 'client certificate', 'strict mode', 'trusted client ca'],
    [
      { id: 'client', type: 'user', name: 'Client (with cert)' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-web' },
      { id: 'agw-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-appgw' },
      { id: 'pip', type: 'pip', parent: 'agw-sub', name: 'pip-agw' },
      { id: 'agw', type: 'appgw', parent: 'agw-sub', name: 'agw-mtls', subtitle: 'mTLS strict', fields: { sku: 'WAF_v2', clientAuth: 'Strict' } },
      { id: 'backend-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-backend' },
      { id: 'vmss', type: 'vmss', parent: 'backend-sub', name: 'vmss-web' },
    ],
    [
      { source: 'client', target: 'pip', kind: 'internet', label: 'TLS + client cert' },
      { source: 'pip', target: 'agw' },
      { source: 'agw', target: 'vmss', kind: 'backend' },
    ]
  ),

  tpl(
    'appgw-keyvault',
    'App Gateway + Key Vault (TLS cert)',
    'Application Delivery',
    'AppGW references a listener certificate stored in Key Vault via user-assigned managed identity.',
    ['key vault', 'listener cert', 'ssl cert', 'user assigned identity', 'cert rotation'],
    [
      { id: 'client', type: 'user', name: 'Client' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-web' },
      { id: 'agw-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-appgw' },
      { id: 'pip', type: 'pip', parent: 'agw-sub', name: 'pip-agw' },
      { id: 'agw', type: 'appgw', parent: 'agw-sub', name: 'agw-web', fields: { sku: 'Standard_v2', identity: 'User-assigned MI' } },
      { id: 'kv', type: 'key-vault', name: 'kv-tls-certs', subtitle: 'Listener cert' },
      { id: 'backend-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-backend' },
      { id: 'app', type: 'app-service', parent: 'backend-sub', name: 'app-web' },
    ],
    [
      { source: 'client', target: 'pip', kind: 'internet', label: 'HTTPS' },
      { source: 'pip', target: 'agw' },
      { source: 'agw', target: 'kv', kind: 'link', label: 'Get cert (MI)' },
      { source: 'agw', target: 'app', kind: 'backend' },
    ]
  ),

  tpl(
    'appgw-path-routing',
    'App Gateway Path-based Routing',
    'Application Delivery',
    'Single AppGW hosts /api /images /* paths — each maps to a different backend pool.',
    ['path routing', 'url path map', 'multiple backends', 'listener', 'rule'],
    [
      { id: 'client', type: 'user', name: 'Client' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-web' },
      { id: 'agw-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-appgw' },
      { id: 'pip', type: 'pip', parent: 'agw-sub', name: 'pip-agw' },
      { id: 'agw', type: 'appgw', parent: 'agw-sub', name: 'agw-multi', subtitle: 'Path-based routing' },
      { id: 'api-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-api' },
      { id: 'api', type: 'app-service', parent: 'api-sub', name: 'app-api', subtitle: '/api' },
      { id: 'img-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-static' },
      { id: 'img', type: 'storage', parent: 'img-sub', name: 'st-images', subtitle: '/images' },
      { id: 'web-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-web' },
      { id: 'web', type: 'vmss', parent: 'web-sub', name: 'vmss-web', subtitle: '/* default' },
    ],
    [
      { source: 'client', target: 'pip', kind: 'internet' },
      { source: 'pip', target: 'agw' },
      { source: 'agw', target: 'api', kind: 'backend', label: '/api/*' },
      { source: 'agw', target: 'img', kind: 'backend', label: '/images/*' },
      { source: 'agw', target: 'web', kind: 'backend', label: '/* default' },
    ]
  ),

  tpl(
    'front-door-apim',
    'Front Door + APIM + Backend',
    'Application Delivery',
    'Front Door origin points at APIM Premium (internal VNet mode); APIM fronts internal APIs.',
    ['front door', 'apim', 'global', 'internal apim', 'origin group'],
    [
      { id: 'client', type: 'user', name: 'Client' },
      { id: 'fd', type: 'front-door', name: 'fd-global', fields: { sku: 'Premium' } },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-apim' },
      { id: 'apim-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-apim' },
      { id: 'apim', type: 'api-management', parent: 'apim-sub', name: 'apim-internal', fields: { sku: 'Premium', mode: 'Internal VNet' } },
      { id: 'be-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-backend' },
      { id: 'be', type: 'app-service', parent: 'be-sub', name: 'app-api' },
      { id: 'pls', type: 'private-link-service', parent: 'apim-sub', name: 'pls-apim' },
    ],
    [
      { source: 'client', target: 'fd', kind: 'internet' },
      { source: 'fd', target: 'pls', kind: 'privateendpoint', label: 'Private origin' },
      { source: 'pls', target: 'apim' },
      { source: 'apim', target: 'be', kind: 'backend' },
    ]
  ),

  tpl(
    'front-door-appservice-standard',
    'Front Door Standard → App Service',
    'Application Delivery',
    'Front Door Standard fronting App Service — global CDN + WAF + custom domain in one PaaS.',
    ['front door standard', 'appservice', 'global cdn', 'waf', 'custom domain'],
    [
      { id: 'client', type: 'user', name: 'Client' },
      { id: 'fd', type: 'front-door', name: 'fd-standard', fields: { sku: 'Standard' } },
      { id: 'waf', type: 'waf-policy', name: 'waf-fd' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'app', type: 'app-service', parent: 'region', name: 'app-web' },
    ],
    [
      { source: 'client', target: 'fd', kind: 'internet' },
      { source: 'waf', target: 'fd', kind: 'link' },
      { source: 'fd', target: 'app', kind: 'backend' },
    ]
  ),

  tpl(
    'webapp-vnet-integration',
    'App Service Regional VNet Integration',
    'Application Delivery',
    'App Service outbound traffic routed through a delegated subnet — reaches SQL PE / on-prem.',
    ['vnet integration', 'delegated subnet', 'outbound', 'regional integration', 'hybrid app'],
    [
      { id: 'client', type: 'user', name: 'Client' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app' },
      { id: 'int-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-appservice', subtitle: 'Delegated' },
      { id: 'app', type: 'app-service', name: 'app-web', subtitle: 'Multi-tenant' },
      { id: 'pe-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-pe' },
      { id: 'pe', type: 'private-endpoint', parent: 'pe-sub', name: 'pe-sql' },
      { id: 'sql', type: 'sql-db', name: 'sql-app' },
    ],
    [
      { source: 'client', target: 'app', kind: 'internet' },
      { source: 'app', target: 'int-sub', kind: 'link', label: 'Outbound' },
      { source: 'int-sub', target: 'pe', kind: 'link' },
      { source: 'pe', target: 'sql', kind: 'privateendpoint' },
    ]
  ),

  // =========================================================================
  // MORE LOAD BALANCING
  // =========================================================================
  tpl(
    'cross-region-lb',
    'Cross-region Load Balancer (Global)',
    'Load Balancing',
    'Standard Global LB fronts regional Standard LBs — geo-redundant, single anycast frontend IP.',
    ['global lb', 'cross region', 'anycast', 'multi region backend', 'geo redundant'],
    [
      { id: 'client', type: 'user', name: 'Client' },
      { id: 'glb', type: 'lb', name: 'lb-global', subtitle: 'Global Standard LB' },
      { id: 'region-a', type: 'group-region', name: 'East US' },
      { id: 'lb-a', type: 'lb', parent: 'region-a', name: 'lb-eus' },
      { id: 'vnet-a', type: 'group-vnet', parent: 'region-a', name: 'vnet-eus' },
      { id: 'sub-a', type: 'group-subnet', parent: 'vnet-a', name: 'snet-web' },
      { id: 'vmss-a', type: 'vmss', parent: 'sub-a', name: 'vmss-eus' },
      { id: 'region-b', type: 'group-region', name: 'West US' },
      { id: 'lb-b', type: 'lb', parent: 'region-b', name: 'lb-wus' },
      { id: 'vnet-b', type: 'group-vnet', parent: 'region-b', name: 'vnet-wus' },
      { id: 'sub-b', type: 'group-subnet', parent: 'vnet-b', name: 'snet-web' },
      { id: 'vmss-b', type: 'vmss', parent: 'sub-b', name: 'vmss-wus' },
    ],
    [
      { source: 'client', target: 'glb', kind: 'internet' },
      { source: 'glb', target: 'lb-a', kind: 'backend' },
      { source: 'glb', target: 'lb-b', kind: 'backend' },
      { source: 'lb-a', target: 'vmss-a', kind: 'backend' },
      { source: 'lb-b', target: 'vmss-b', kind: 'backend' },
    ]
  ),

  tpl(
    'gateway-lb-nva',
    'Gateway Load Balancer (chain NVA)',
    'Load Balancing',
    'Gateway LB inserts an NVA transparently between a consumer LB and its backends.',
    ['gateway lb', 'nva chain', 'transparent', 'consumer producer', 'ha ports'],
    [
      { id: 'client', type: 'user', name: 'Client' },
      { id: 'consumer-lb', type: 'lb', name: 'lb-consumer', subtitle: 'Public LB' },
      { id: 'consumer-vnet', type: 'group-vnet', name: 'vnet-consumer' },
      { id: 'con-sub', type: 'group-subnet', parent: 'consumer-vnet', name: 'snet-web' },
      { id: 'vmss', type: 'vmss', parent: 'con-sub', name: 'vmss-web' },
      { id: 'glb', type: 'lb', name: 'lb-gateway', subtitle: 'Gateway LB' },
      { id: 'nva-vnet', type: 'group-vnet', name: 'vnet-nva' },
      { id: 'nva-sub', type: 'group-subnet', parent: 'nva-vnet', name: 'snet-nva' },
      { id: 'nva1', type: 'nva', parent: 'nva-sub', name: 'nva-1' },
      { id: 'nva2', type: 'nva', parent: 'nva-sub', name: 'nva-2' },
    ],
    [
      { source: 'client', target: 'consumer-lb', kind: 'internet' },
      { source: 'consumer-lb', target: 'glb', kind: 'link', label: 'Chain (transparent)' },
      { source: 'glb', target: 'nva1', kind: 'backend' },
      { source: 'glb', target: 'nva2', kind: 'backend' },
      { source: 'consumer-lb', target: 'vmss', kind: 'backend' },
    ]
  ),

  tpl(
    'lb-ha-ports',
    'Standard LB with HA Ports (NVA cluster)',
    'Load Balancing',
    'Internal Standard LB with HA Ports rule — load-balances all TCP/UDP flows across NVA cluster.',
    ['ha ports', 'internal lb', 'all-port', 'nva ha', 'active active'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-hub' },
      { id: 'nva-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-nva' },
      { id: 'nva1', type: 'nva', parent: 'nva-sub', name: 'nva-1' },
      { id: 'nva2', type: 'nva', parent: 'nva-sub', name: 'nva-2' },
      { id: 'ilb', type: 'lb', parent: 'nva-sub', name: 'ilb-ha-ports', subtitle: 'HA Ports rule' },
      { id: 'client-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-workload' },
      { id: 'vm', type: 'vm', parent: 'client-sub', name: 'vm-client' },
    ],
    [
      { source: 'vm', target: 'ilb', kind: 'link', label: 'via UDR' },
      { source: 'ilb', target: 'nva1', kind: 'backend' },
      { source: 'ilb', target: 'nva2', kind: 'backend' },
    ]
  ),

  tpl(
    'lb-zone-redundant',
    'Zone-redundant Standard LB',
    'Load Balancing',
    'Standard LB with zone-redundant frontend + VMSS spread across 3 availability zones.',
    ['zone redundant', 'availability zones', 'zone 1 2 3', 'vmss zones', 'sla'],
    [
      { id: 'client', type: 'user', name: 'Client' },
      { id: 'region', type: 'group-region', name: 'East US 2', subtitle: 'Zones 1/2/3' },
      { id: 'lb', type: 'lb', parent: 'region', name: 'lb-zr', subtitle: 'Zone-redundant frontend' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app' },
      { id: 'sub', type: 'group-subnet', parent: 'vnet', name: 'snet-web' },
      { id: 'vmss', type: 'vmss', parent: 'sub', name: 'vmss-zones', subtitle: 'Zones 1,2,3' },
    ],
    [
      { source: 'client', target: 'lb', kind: 'internet' },
      { source: 'lb', target: 'vmss', kind: 'backend' },
    ]
  ),

  // =========================================================================
  // MORE PRIVATE ENDPOINT / PRIVATE LINK
  // =========================================================================
  tpl(
    'pe-cognitive',
    'Private Endpoint → Cognitive Services',
    'Private Endpoint & Private Link',
    'PE to Azure OpenAI / Cognitive Services — inference over private IP, no public route.',
    ['cognitive services', 'openai', 'ai foundry', 'private inference', 'openai.azure.com'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-ai' },
      { id: 'pe-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-pe' },
      { id: 'pe', type: 'private-endpoint', parent: 'pe-sub', name: 'pe-openai' },
      { id: 'app-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-app' },
      { id: 'app', type: 'app-service', parent: 'app-sub', name: 'app-consumer' },
      { id: 'cog', type: 'custom', name: 'Azure OpenAI', subtitle: 'privatelink.openai.azure.com' },
      { id: 'dns', type: 'dns-zone', name: 'privatelink.openai.azure.com', fields: { kind: 'Private' } },
    ],
    [
      { source: 'app', target: 'pe', kind: 'link' },
      { source: 'pe', target: 'cog', kind: 'privateendpoint' },
      { source: 'pe', target: 'dns', kind: 'dns' },
    ]
  ),

  tpl(
    'pe-acr',
    'Private Endpoint → Container Registry',
    'Private Endpoint & Private Link',
    'PE to Azure Container Registry — private image pulls for AKS / App Service.',
    ['acr', 'container registry', 'docker pull', 'private image', 'privatelink.azurecr.io'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-aks' },
      { id: 'aks-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-aks' },
      { id: 'aks', type: 'aks', parent: 'aks-sub', name: 'aks-cluster' },
      { id: 'pe-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-pe' },
      { id: 'pe', type: 'private-endpoint', parent: 'pe-sub', name: 'pe-acr' },
      { id: 'acr', type: 'container-registry', name: 'acrprod', subtitle: 'privatelink.azurecr.io' },
      { id: 'dns', type: 'dns-zone', name: 'privatelink.azurecr.io', fields: { kind: 'Private' } },
    ],
    [
      { source: 'aks', target: 'pe', kind: 'link', label: 'docker pull' },
      { source: 'pe', target: 'acr', kind: 'privateendpoint' },
      { source: 'pe', target: 'dns', kind: 'dns' },
    ]
  ),

  tpl(
    'pe-cosmos',
    'Private Endpoint → Cosmos DB',
    'Private Endpoint & Private Link',
    'PE to Cosmos DB — SQL/Mongo/Cassandra endpoint reached over private IP.',
    ['cosmos db', 'documents.azure.com', 'nosql', 'privatelink.documents.azure.com', 'mongo'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app' },
      { id: 'app-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-app' },
      { id: 'app', type: 'app-service', parent: 'app-sub', name: 'app-web' },
      { id: 'pe-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-pe' },
      { id: 'pe', type: 'private-endpoint', parent: 'pe-sub', name: 'pe-cosmos' },
      { id: 'cosmos', type: 'cosmos', name: 'cosmos-app', subtitle: 'privatelink.documents.azure.com' },
      { id: 'dns', type: 'dns-zone', name: 'privatelink.documents.azure.com', fields: { kind: 'Private' } },
    ],
    [
      { source: 'app', target: 'pe', kind: 'link' },
      { source: 'pe', target: 'cosmos', kind: 'privateendpoint' },
      { source: 'pe', target: 'dns', kind: 'dns' },
    ]
  ),

  tpl(
    'pe-event-hub',
    'Private Endpoint → Event Hub',
    'Private Endpoint & Private Link',
    'PE to Event Hub — private ingestion for telemetry / streaming.',
    ['event hub', 'servicebus.windows.net', 'streaming', 'kafka', 'privatelink.servicebus'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-producer' },
      { id: 'app-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-app' },
      { id: 'func', type: 'function-app', parent: 'app-sub', name: 'func-producer' },
      { id: 'pe-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-pe' },
      { id: 'pe', type: 'private-endpoint', parent: 'pe-sub', name: 'pe-eventhub' },
      { id: 'eh', type: 'custom', name: 'Event Hub NS', subtitle: 'privatelink.servicebus.windows.net' },
      { id: 'dns', type: 'dns-zone', name: 'privatelink.servicebus.windows.net', fields: { kind: 'Private' } },
    ],
    [
      { source: 'func', target: 'pe', kind: 'link' },
      { source: 'pe', target: 'eh', kind: 'privateendpoint' },
      { source: 'pe', target: 'dns', kind: 'dns' },
    ]
  ),

  tpl(
    'pe-service-bus',
    'Private Endpoint → Service Bus',
    'Private Endpoint & Private Link',
    'PE to Service Bus Premium — private messaging for microservice architectures.',
    ['service bus', 'queue', 'topic', 'privatelink.servicebus.windows.net', 'premium'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app' },
      { id: 'app-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-app' },
      { id: 'app', type: 'app-service', parent: 'app-sub', name: 'app-publisher' },
      { id: 'pe-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-pe' },
      { id: 'pe', type: 'private-endpoint', parent: 'pe-sub', name: 'pe-sb' },
      { id: 'sb', type: 'custom', name: 'Service Bus NS', subtitle: 'Premium' },
      { id: 'dns', type: 'dns-zone', name: 'privatelink.servicebus.windows.net', fields: { kind: 'Private' } },
    ],
    [
      { source: 'app', target: 'pe', kind: 'link' },
      { source: 'pe', target: 'sb', kind: 'privateendpoint' },
      { source: 'pe', target: 'dns', kind: 'dns' },
    ]
  ),

  tpl(
    'pe-ampls',
    'Azure Monitor Private Link (AMPLS)',
    'Private Endpoint & Private Link',
    'PE to Azure Monitor Private Link Scope — private ingestion for Log Analytics + App Insights.',
    ['ampls', 'log analytics', 'app insights', 'monitor private link', 'ingest'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-monitored' },
      { id: 'app-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-workload' },
      { id: 'vm', type: 'vm', parent: 'app-sub', name: 'vm-agent', subtitle: 'AMA agent' },
      { id: 'pe-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-pe' },
      { id: 'pe', type: 'private-endpoint', parent: 'pe-sub', name: 'pe-ampls' },
      { id: 'ampls', type: 'custom', name: 'AMPLS scope' },
      { id: 'la', type: 'custom', name: 'Log Analytics' },
      { id: 'ai', type: 'custom', name: 'App Insights' },
      { id: 'dns1', type: 'dns-zone', name: 'privatelink.monitor.azure.com' },
      { id: 'dns2', type: 'dns-zone', name: 'privatelink.oms.opinsights.azure.com' },
    ],
    [
      { source: 'vm', target: 'pe', kind: 'link' },
      { source: 'pe', target: 'ampls', kind: 'privateendpoint' },
      { source: 'ampls', target: 'la' }, { source: 'ampls', target: 'ai' },
      { source: 'pe', target: 'dns1', kind: 'dns' },
      { source: 'pe', target: 'dns2', kind: 'dns' },
    ]
  ),

  // =========================================================================
  // MORE FIREWALL & SECURITY
  // =========================================================================
  tpl(
    'firewall-dnat',
    'Azure Firewall DNAT (inbound to VM)',
    'Firewall & Security',
    'Firewall DNAT rule maps its public IP to an internal VM — inbound SSH/RDP without a jump box.',
    ['dnat', 'inbound nat', 'firewall public ip', 'rdp', 'ssh through firewall'],
    [
      { id: 'client', type: 'user', name: 'Admin' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-hub' },
      { id: 'fw-sub', type: 'group-subnet', parent: 'vnet', name: 'AzureFirewallSubnet' },
      { id: 'fw-pip', type: 'pip', parent: 'fw-sub', name: 'pip-afw' },
      { id: 'fw', type: 'firewall', parent: 'fw-sub', name: 'afw-hub', subtitle: 'DNAT rule collection' },
      { id: 'wkl-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-workload' },
      { id: 'vm', type: 'vm', parent: 'wkl-sub', name: 'vm-target', fields: { privateIp: '10.0.1.4' } },
    ],
    [
      { source: 'client', target: 'fw-pip', kind: 'internet', label: 'RDP/SSH' },
      { source: 'fw-pip', target: 'fw' },
      { source: 'fw', target: 'vm', kind: 'link', label: 'DNAT: 3389→3389' },
    ]
  ),

  tpl(
    'firewall-basic',
    'Azure Firewall Basic',
    'Firewall & Security',
    'Firewall Basic SKU for SMB — up to 250 Mbps, no threat intel, ideal for lab / small hub.',
    ['basic sku', 'smb', 'lightweight firewall', 'cost optimized', 'management subnet'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-hub' },
      { id: 'fw-sub', type: 'group-subnet', parent: 'vnet', name: 'AzureFirewallSubnet' },
      { id: 'mgmt-sub', type: 'group-subnet', parent: 'vnet', name: 'AzureFirewallManagementSubnet', subtitle: 'Required for Basic' },
      { id: 'fw', type: 'firewall', parent: 'fw-sub', name: 'afw-basic', fields: { sku: 'Basic' } },
      { id: 'fw-pip', type: 'pip', parent: 'fw-sub', name: 'pip-afw' },
      { id: 'mgmt-pip', type: 'pip', parent: 'mgmt-sub', name: 'pip-afw-mgmt' },
      { id: 'wkl-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-workload' },
      { id: 'vm', type: 'vm', parent: 'wkl-sub', name: 'vm-workload' },
      { id: 'internet', type: 'internet', name: 'Internet' },
    ],
    [
      { source: 'fw-pip', target: 'fw' }, { source: 'mgmt-pip', target: 'fw' },
      { source: 'vm', target: 'fw', kind: 'link', label: 'Egress' },
      { source: 'fw', target: 'internet', kind: 'internet' },
    ]
  ),

  tpl(
    'firewall-ip-groups',
    'Azure Firewall + IP Groups',
    'Firewall & Security',
    'IP Groups let you manage IP prefixes centrally — reused across many rule collections.',
    ['ip group', 'centralized ips', 'rule reuse', 'source ips', 'network rule'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-hub' },
      { id: 'fw-sub', type: 'group-subnet', parent: 'vnet', name: 'AzureFirewallSubnet' },
      { id: 'fw', type: 'firewall', parent: 'fw-sub', name: 'afw-hub' },
      { id: 'policy', type: 'firewall-policy', name: 'afwp-hub' },
      { id: 'ipg-corp', type: 'ip-group', name: 'ipg-corporate', subtitle: 'Corp IP ranges' },
      { id: 'ipg-branches', type: 'ip-group', name: 'ipg-branch-sites', subtitle: 'Branch IPs' },
      { id: 'wkl-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-workload' },
      { id: 'vm', type: 'vm', parent: 'wkl-sub', name: 'vm-app' },
    ],
    [
      { source: 'policy', target: 'fw', kind: 'link' },
      { source: 'ipg-corp', target: 'policy', kind: 'link', label: 'Sources' },
      { source: 'ipg-branches', target: 'policy', kind: 'link', label: 'Sources' },
      { source: 'vm', target: 'fw', kind: 'link' },
    ]
  ),

  // =========================================================================
  // MORE DNS
  // =========================================================================
  tpl(
    'dns-split-brain',
    'Split-brain DNS (public + private)',
    'DNS',
    'Same domain name resolved differently for internal (Private Zone) vs external (Public Zone) clients.',
    ['split horizon', 'split brain', 'public + private zone', 'internal external', 'view based dns'],
    [
      { id: 'client-ext', type: 'user', name: 'External client' },
      { id: 'public-zone', type: 'dns-zone', name: 'contoso.com', fields: { kind: 'Public' } },
      { id: 'internet', type: 'internet', name: 'Internet' },
      { id: 'lb-public', type: 'lb', name: 'lb-public' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app' },
      { id: 'sub-int', type: 'group-subnet', parent: 'vnet', name: 'snet-internal' },
      { id: 'client-int', type: 'vm', parent: 'sub-int', name: 'vm-internal' },
      { id: 'private-zone', type: 'dns-zone', name: 'contoso.com', fields: { kind: 'Private', linkedVnet: 'vnet-app' } },
      { id: 'lb-internal', type: 'lb', name: 'lb-internal' },
    ],
    [
      { source: 'client-ext', target: 'public-zone', kind: 'dns', label: 'app.contoso.com → public IP' },
      { source: 'public-zone', target: 'lb-public' },
      { source: 'client-int', target: 'private-zone', kind: 'dns', label: 'app.contoso.com → 10.0.0.10' },
      { source: 'private-zone', target: 'lb-internal' },
      { source: 'client-ext', target: 'internet', kind: 'internet' },
    ]
  ),

  tpl(
    'dns-onprem-forwarder',
    'On-prem DNS with Private Zone forwarding',
    'DNS',
    'On-prem DNS forwards *.privatelink.* to Azure via DNS Private Resolver inbound endpoint.',
    ['on-prem forwarder', 'conditional forwarder', 'hybrid dns', 'inbound endpoint', 'resolver'],
    [
      { id: 'onprem', type: 'group-onprem', name: 'On-premises' },
      { id: 'onprem-dns', type: 'nva', parent: 'onprem', name: 'On-prem DNS', subtitle: 'Windows DNS' },
      { id: 'onprem-client', type: 'vm', parent: 'onprem', name: 'Workstation' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-hub' },
      { id: 'resolver-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-resolver-inbound' },
      { id: 'resolver', type: 'dns-resolver', parent: 'resolver-sub', name: 'dns-resolver-inbound' },
      { id: 'pe-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-pe' },
      { id: 'pe', type: 'private-endpoint', parent: 'pe-sub', name: 'pe-sql' },
      { id: 'sql', type: 'sql-db', name: 'sql-app' },
      { id: 'zone', type: 'dns-zone', name: 'privatelink.database.windows.net', fields: { kind: 'Private' } },
    ],
    [
      { source: 'onprem-client', target: 'onprem-dns', kind: 'dns', label: 'sql.database.windows.net?' },
      { source: 'onprem-dns', target: 'resolver', kind: 'dns', label: 'Fwd *.privatelink.*' },
      { source: 'resolver', target: 'zone', kind: 'dns' },
      { source: 'zone', target: 'pe' }, { source: 'pe', target: 'sql', kind: 'privateendpoint' },
    ]
  ),

  // =========================================================================
  // MORE NAT & EGRESS
  // =========================================================================
  tpl(
    'nat-per-subnet',
    'NAT Gateway per subnet (SNAT scale)',
    'NAT & Egress',
    'Dedicated NAT GW per subnet — 64K SNAT ports per PIP × 16 PIPs = massive SNAT capacity.',
    ['snat exhaustion', 'nat gateway', 'port budget', 'multiple pips', 'egress ip'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app' },
      { id: 'sub1', type: 'group-subnet', parent: 'vnet', name: 'snet-web' },
      { id: 'vmss1', type: 'vmss', parent: 'sub1', name: 'vmss-web' },
      { id: 'nat1', type: 'nat', parent: 'sub1', name: 'nat-web' },
      { id: 'pip1', type: 'pip', parent: 'sub1', name: 'pip-nat-web' },
      { id: 'sub2', type: 'group-subnet', parent: 'vnet', name: 'snet-worker' },
      { id: 'vmss2', type: 'vmss', parent: 'sub2', name: 'vmss-worker' },
      { id: 'nat2', type: 'nat', parent: 'sub2', name: 'nat-worker' },
      { id: 'pip2', type: 'pip', parent: 'sub2', name: 'pip-nat-worker' },
      { id: 'internet', type: 'internet', name: 'Internet' },
    ],
    [
      { source: 'vmss1', target: 'nat1', kind: 'link' }, { source: 'nat1', target: 'pip1' }, { source: 'pip1', target: 'internet', kind: 'internet' },
      { source: 'vmss2', target: 'nat2', kind: 'link' }, { source: 'nat2', target: 'pip2' }, { source: 'pip2', target: 'internet', kind: 'internet' },
    ]
  ),

  // =========================================================================
  // MORE KUBERNETES
  // =========================================================================
  tpl(
    'aks-firewall-egress',
    'AKS with Firewall Egress',
    'Kubernetes',
    'AKS egress locked down — UDR sends 0.0.0.0/0 to Azure Firewall which filters egress FQDNs.',
    ['aks egress', 'egress lockdown', 'fqdn filter', 'required fqdns', 'restrict egress'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-hub' },
      { id: 'fw-sub', type: 'group-subnet', parent: 'vnet', name: 'AzureFirewallSubnet' },
      { id: 'fw', type: 'firewall', parent: 'fw-sub', name: 'afw-hub', subtitle: 'FQDN filter' },
      { id: 'aks-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-aks' },
      { id: 'aks', type: 'aks', parent: 'aks-sub', name: 'aks-locked' },
      { id: 'udr', type: 'udr', name: 'rt-aks', notes: '0.0.0.0/0 next hop = firewall' },
      { id: 'internet', type: 'internet', name: 'Internet' },
    ],
    [
      { source: 'udr', target: 'aks-sub', kind: 'link' },
      { source: 'aks', target: 'fw', kind: 'link', label: 'Egress via UDR' },
      { source: 'fw', target: 'internet', kind: 'internet', label: 'FQDN allow-list' },
    ]
  ),

  tpl(
    'aks-cni-overlay',
    'AKS with Azure CNI Overlay',
    'Kubernetes',
    'CNI Overlay: pod IPs come from an overlay space (not VNet CIDR) — saves IP space at scale.',
    ['cni overlay', 'pod cidr', 'ip conservation', 'overlay networking', 'aks large scale'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-aks', fields: { cidr: '10.0.0.0/16' } },
      { id: 'aks-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-aks', fields: { cidr: '10.0.1.0/24' } },
      { id: 'aks', type: 'aks', parent: 'aks-sub', name: 'aks-overlay', subtitle: 'Pod CIDR 172.16.0.0/12', fields: { network: 'Azure CNI Overlay' } },
    ],
    [] as TplEdge[]
  ),

  tpl(
    'aks-appgw-cosmos',
    'AKS behind AppGW + PE to Cosmos',
    'Kubernetes',
    'End-to-end private stack: AppGW ingress + AKS pods + Private Endpoint to Cosmos DB.',
    ['aks reference', 'appgw ingress', 'agic', 'cosmos db', 'end to end private'],
    [
      { id: 'user', type: 'user', name: 'Client' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app' },
      { id: 'agw-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-appgw' },
      { id: 'pip', type: 'pip', parent: 'agw-sub', name: 'pip-agw' },
      { id: 'agw', type: 'appgw', parent: 'agw-sub', name: 'agw-ingress', fields: { sku: 'WAF_v2' } },
      { id: 'aks-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-aks' },
      { id: 'aks', type: 'aks', parent: 'aks-sub', name: 'aks-app' },
      { id: 'pe-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-pe' },
      { id: 'pe', type: 'private-endpoint', parent: 'pe-sub', name: 'pe-cosmos' },
      { id: 'cosmos', type: 'cosmos', name: 'cosmos-app' },
    ],
    [
      { source: 'user', target: 'pip', kind: 'internet' }, { source: 'pip', target: 'agw' },
      { source: 'agw', target: 'aks', kind: 'backend' },
      { source: 'aks', target: 'pe', kind: 'link' }, { source: 'pe', target: 'cosmos', kind: 'privateendpoint' },
    ]
  ),

  // =========================================================================
  // MORE SEGMENTATION & ROUTING
  // =========================================================================
  tpl(
    'route-server-nva-bgp',
    'Azure Route Server + NVA (BGP)',
    'Segmentation & Routing',
    'NVA exchanges BGP with Route Server — Azure learns NVA routes without manual UDRs.',
    ['route server', 'bgp peering', 'nva bgp', 'dynamic routing', 'branch to branch'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-hub' },
      { id: 'rs-sub', type: 'group-subnet', parent: 'vnet', name: 'RouteServerSubnet' },
      { id: 'rs', type: 'nva', parent: 'rs-sub', name: 'ars-hub', subtitle: 'Azure Route Server', fields: { asn: '65515' } },
      { id: 'nva-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-nva' },
      { id: 'nva', type: 'nva', parent: 'nva-sub', name: 'nva-bgp', fields: { asn: '65001' } },
      { id: 'onprem', type: 'group-onprem', name: 'On-premises' },
      { id: 'onprem-router', type: 'nva', parent: 'onprem', name: 'On-prem router' },
    ],
    [
      { source: 'nva', target: 'rs', kind: 'link', label: 'BGP peer' },
      { source: 'onprem-router', target: 'nva', kind: 'link', label: 'BGP (branch)' },
    ]
  ),

  tpl(
    'nva-ha-cluster',
    'NVA HA Cluster (Active-Active with LB)',
    'Segmentation & Routing',
    'Two NVAs behind a Standard LB with HA Ports rule — active-active failover for firewall appliances.',
    ['nva ha', 'active active', 'palo alto ha', 'fortinet ha', 'ha ports rule'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-hub' },
      { id: 'ext-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-nva-external' },
      { id: 'ext-lb', type: 'lb', parent: 'ext-sub', name: 'lb-nva-ext', subtitle: 'HA Ports' },
      { id: 'ext-pip', type: 'pip', parent: 'ext-sub', name: 'pip-lb-ext' },
      { id: 'int-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-nva-internal' },
      { id: 'int-lb', type: 'lb', parent: 'int-sub', name: 'lb-nva-int', subtitle: 'HA Ports' },
      { id: 'nva1', type: 'nva', parent: 'ext-sub', name: 'nva-1' },
      { id: 'nva2', type: 'nva', parent: 'ext-sub', name: 'nva-2' },
      { id: 'wkl-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-workload' },
      { id: 'vm', type: 'vm', parent: 'wkl-sub', name: 'vm-app' },
      { id: 'internet', type: 'internet', name: 'Internet' },
    ],
    [
      { source: 'internet', target: 'ext-pip', kind: 'internet' }, { source: 'ext-pip', target: 'ext-lb' },
      { source: 'ext-lb', target: 'nva1', kind: 'backend' }, { source: 'ext-lb', target: 'nva2', kind: 'backend' },
      { source: 'vm', target: 'int-lb', kind: 'link', label: 'via UDR' },
      { source: 'int-lb', target: 'nva1', kind: 'backend' }, { source: 'int-lb', target: 'nva2', kind: 'backend' },
    ]
  ),

  tpl(
    'n-tier-nsg-segmented',
    '3-tier NSG-segmented (Web/App/DB)',
    'Segmentation & Routing',
    'Classic 3-tier — Web/App/DB subnets each with an NSG restricting traffic to prior tier only.',
    ['n-tier', 'three tier', 'nsg segmentation', 'web app db', 'defense in depth'],
    [
      { id: 'user', type: 'user', name: 'Client' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app' },
      { id: 'web-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-web' },
      { id: 'web-nsg', type: 'nsg', parent: 'web-sub', name: 'nsg-web', subtitle: 'Allow HTTPS' },
      { id: 'web-vmss', type: 'vmss', parent: 'web-sub', name: 'vmss-web' },
      { id: 'app-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-app' },
      { id: 'app-nsg', type: 'nsg', parent: 'app-sub', name: 'nsg-app', subtitle: 'Allow from Web' },
      { id: 'app-vmss', type: 'vmss', parent: 'app-sub', name: 'vmss-app' },
      { id: 'db-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-db' },
      { id: 'db-nsg', type: 'nsg', parent: 'db-sub', name: 'nsg-db', subtitle: 'Allow from App' },
      { id: 'db-vm', type: 'vm', parent: 'db-sub', name: 'vm-db' },
    ],
    [
      { source: 'user', target: 'web-vmss', kind: 'internet', label: 'HTTPS' },
      { source: 'web-vmss', target: 'app-vmss', kind: 'link', label: 'API' },
      { source: 'app-vmss', target: 'db-vm', kind: 'link', label: 'SQL' },
    ]
  ),

  // =========================================================================
  // MULTI-REGION & DR
  // =========================================================================
  tpl(
    'multi-region-active-active',
    'Multi-region Active-Active (Front Door)',
    'Multi-Region & DR',
    'Front Door balances traffic across 2 regional stamps — each stamp fully self-contained.',
    ['active active', 'multi region', 'front door', 'stamp', 'geo distribution'],
    [
      { id: 'user', type: 'user', name: 'Global users' },
      { id: 'fd', type: 'front-door', name: 'fd-global', fields: { sku: 'Premium' } },
      { id: 'region-a', type: 'group-region', name: 'East US' },
      { id: 'vnet-a', type: 'group-vnet', parent: 'region-a', name: 'vnet-eus' },
      { id: 'a-sub', type: 'group-subnet', parent: 'vnet-a', name: 'snet-web' },
      { id: 'app-a', type: 'app-service', parent: 'a-sub', name: 'app-eus' },
      { id: 'db-a', type: 'sql-db', parent: 'region-a', name: 'sql-eus', subtitle: 'Primary/geo replica' },
      { id: 'region-b', type: 'group-region', name: 'West Europe' },
      { id: 'vnet-b', type: 'group-vnet', parent: 'region-b', name: 'vnet-weu' },
      { id: 'b-sub', type: 'group-subnet', parent: 'vnet-b', name: 'snet-web' },
      { id: 'app-b', type: 'app-service', parent: 'b-sub', name: 'app-weu' },
      { id: 'db-b', type: 'sql-db', parent: 'region-b', name: 'sql-weu', subtitle: 'Geo-secondary' },
    ],
    [
      { source: 'user', target: 'fd', kind: 'internet' },
      { source: 'fd', target: 'app-a', kind: 'backend' },
      { source: 'fd', target: 'app-b', kind: 'backend' },
      { source: 'app-a', target: 'db-a', kind: 'link' }, { source: 'app-b', target: 'db-b', kind: 'link' },
      { source: 'db-a', target: 'db-b', kind: 'link', label: 'Geo replication' },
    ]
  ),

  tpl(
    'multi-region-active-passive',
    'Multi-region Active-Passive (Traffic Manager)',
    'Multi-Region & DR',
    'Traffic Manager Priority — primary region serves all traffic; secondary takes over on health failure.',
    ['dr', 'active passive', 'traffic manager', 'priority', 'failover'],
    [
      { id: 'user', type: 'user', name: 'Global users' },
      { id: 'tm', type: 'traffic-manager', name: 'tm-app', subtitle: 'Priority routing' },
      { id: 'region-a', type: 'group-region', name: 'East US (Primary)' },
      { id: 'agw-a', type: 'appgw', parent: 'region-a', name: 'agw-eus' },
      { id: 'app-a', type: 'app-service', parent: 'region-a', name: 'app-eus' },
      { id: 'region-b', type: 'group-region', name: 'West US (DR)' },
      { id: 'agw-b', type: 'appgw', parent: 'region-b', name: 'agw-wus', state: 'degraded', subtitle: 'Warm standby' },
      { id: 'app-b', type: 'app-service', parent: 'region-b', name: 'app-wus', state: 'degraded' },
    ],
    [
      { source: 'user', target: 'tm', kind: 'internet' },
      { source: 'tm', target: 'agw-a', kind: 'backend', label: 'Priority 1' },
      { source: 'tm', target: 'agw-b', kind: 'backend', label: 'Priority 2 (DR)' },
      { source: 'agw-a', target: 'app-a', kind: 'backend' },
      { source: 'agw-b', target: 'app-b', kind: 'backend' },
    ]
  ),

  tpl(
    'n-tier-vm',
    'N-tier VM Web App (Web/App/DB)',
    'Multi-Region & DR',
    'Classic 3-tier VM web app — public LB → Web VMs → App VMs → SQL VM (behind ILB).',
    ['n-tier', 'iaas', 'vm reference', 'three tier', 'sql on vm'],
    [
      { id: 'user', type: 'user', name: 'Client' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'lb-pub', type: 'lb', parent: 'region', name: 'lb-public' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app' },
      { id: 'web-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-web' },
      { id: 'web-vmss', type: 'vmss', parent: 'web-sub', name: 'vmss-web' },
      { id: 'app-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-app' },
      { id: 'ilb-app', type: 'lb', parent: 'app-sub', name: 'ilb-app' },
      { id: 'app-vmss', type: 'vmss', parent: 'app-sub', name: 'vmss-app' },
      { id: 'db-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-db' },
      { id: 'ilb-db', type: 'lb', parent: 'db-sub', name: 'ilb-db' },
      { id: 'db-vm', type: 'vm', parent: 'db-sub', name: 'vm-sql' },
    ],
    [
      { source: 'user', target: 'lb-pub', kind: 'internet' },
      { source: 'lb-pub', target: 'web-vmss', kind: 'backend' },
      { source: 'web-vmss', target: 'ilb-app', kind: 'backend' },
      { source: 'ilb-app', target: 'app-vmss', kind: 'backend' },
      { source: 'app-vmss', target: 'ilb-db', kind: 'backend' },
      { source: 'ilb-db', target: 'db-vm', kind: 'backend' },
    ]
  ),

  tpl(
    'e-commerce-reference',
    'E-commerce reference stack',
    'Multi-Region & DR',
    'Front Door + AppGW + AKS + Cosmos DB + Storage — canonical modern e-commerce topology.',
    ['ecommerce', 'reference architecture', 'end to end', 'modern app', 'microservices'],
    [
      { id: 'user', type: 'user', name: 'Shopper' },
      { id: 'fd', type: 'front-door', name: 'fd-shop', fields: { sku: 'Premium' } },
      { id: 'waf', type: 'waf-policy', name: 'waf-fd' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-shop' },
      { id: 'agw-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-appgw' },
      { id: 'agw', type: 'appgw', parent: 'agw-sub', name: 'agw-shop', fields: { sku: 'WAF_v2' } },
      { id: 'aks-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-aks' },
      { id: 'aks', type: 'aks', parent: 'aks-sub', name: 'aks-shop' },
      { id: 'pe-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-pe' },
      { id: 'pe-cosmos', type: 'private-endpoint', parent: 'pe-sub', name: 'pe-cosmos' },
      { id: 'pe-storage', type: 'private-endpoint', parent: 'pe-sub', name: 'pe-storage' },
      { id: 'cosmos', type: 'cosmos', name: 'cosmos-orders' },
      { id: 'st', type: 'storage', name: 'st-images' },
    ],
    [
      { source: 'user', target: 'fd', kind: 'internet' }, { source: 'waf', target: 'fd' },
      { source: 'fd', target: 'agw', kind: 'backend', label: 'Private origin' },
      { source: 'agw', target: 'aks', kind: 'backend' },
      { source: 'aks', target: 'pe-cosmos', kind: 'link' }, { source: 'pe-cosmos', target: 'cosmos', kind: 'privateendpoint' },
      { source: 'aks', target: 'pe-storage', kind: 'link' }, { source: 'pe-storage', target: 'st', kind: 'privateendpoint' },
    ]
  ),

  // =========================================================================
  // MONITORING & DIAGNOSTICS
  // =========================================================================
  tpl(
    'network-watcher-connection-monitor',
    'Network Watcher — Connection Monitor',
    'Monitoring & Diagnostics',
    'Connection Monitor probes reachability across on-prem, VMs, and PaaS with private endpoints.',
    ['network watcher', 'connection monitor', 'reachability test', 'latency', 'network diagnostics'],
    [
      { id: 'nw', type: 'network-watcher', name: 'Network Watcher' },
      { id: 'onprem', type: 'group-onprem', name: 'On-premises' },
      { id: 'onprem-agent', type: 'vm', parent: 'onprem', name: 'On-prem source' },
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-monitored' },
      { id: 'app-sub', type: 'group-subnet', parent: 'vnet', name: 'snet-app' },
      { id: 'vm', type: 'vm', parent: 'app-sub', name: 'vm-target' },
      { id: 'app', type: 'app-service', parent: 'region', name: 'app-web' },
    ],
    [
      { source: 'nw', target: 'onprem-agent', kind: 'link', label: 'Probe' },
      { source: 'nw', target: 'vm', kind: 'link', label: 'Probe' },
      { source: 'onprem-agent', target: 'vm', kind: 'link', label: 'Measured' },
      { source: 'onprem-agent', target: 'app', kind: 'link', label: 'Measured' },
    ]
  ),

  tpl(
    'nsg-flow-logs',
    'NSG Flow Logs → Traffic Analytics',
    'Monitoring & Diagnostics',
    'NSG Flow Logs → Storage → Traffic Analytics workspace for visualization.',
    ['flow logs', 'nsg logs', 'traffic analytics', 'log analytics', 'geneva'],
    [
      { id: 'region', type: 'group-region', name: 'East US' },
      { id: 'vnet', type: 'group-vnet', parent: 'region', name: 'vnet-app' },
      { id: 'sub', type: 'group-subnet', parent: 'vnet', name: 'snet-workload' },
      { id: 'nsg', type: 'nsg', parent: 'sub', name: 'nsg-workload' },
      { id: 'vm', type: 'vm', parent: 'sub', name: 'vm-app' },
      { id: 'st', type: 'storage', name: 'st-flowlogs' },
      { id: 'la', type: 'custom', name: 'Log Analytics ws' },
      { id: 'ta', type: 'custom', name: 'Traffic Analytics' },
    ],
    [
      { source: 'nsg', target: 'st', kind: 'link', label: 'Flow logs (v2)' },
      { source: 'st', target: 'la', kind: 'link' },
      { source: 'la', target: 'ta' },
    ]
  ),
];

/**
 * Microsoft Learn article each template rebuilds.
 *
 * Kept as a separate map rather than a 9th positional argument to `tpl()` so
 * the 78 existing calls stay untouched and every source link is reviewable in
 * one block. A template with no entry here simply has no `source` — an absent
 * link is honest, an invented one is not, so nothing is guessed to fill gaps.
 *
 * Every URL is checked by `npm run check:links`.
 */
const TEMPLATE_SOURCES: Record<string, { title: string; url: string }> = {
  // Hybrid connectivity
  'vpn-s2s-routebased': {
    title: 'About Site-to-Site VPN Gateway connections',
    url: 'https://learn.microsoft.com/azure/vpn-gateway/design',
  },
  'vpn-p2s-aad': {
    title: 'About Point-to-Site VPN',
    url: 'https://learn.microsoft.com/azure/vpn-gateway/point-to-site-about',
  },
  'vnet-to-vnet-vpn': {
    title: 'Configure a VNet-to-VNet VPN gateway connection',
    url: 'https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-howto-vnet-vnet-resource-manager-portal',
  },
  'expressroute-private-peering': {
    title: 'ExpressRoute circuits and peering',
    url: 'https://learn.microsoft.com/azure/expressroute/expressroute-circuit-peerings',
  },
  'er-vpn-failover': {
    title: 'Coexisting ExpressRoute and Site-to-Site connections',
    url: 'https://learn.microsoft.com/azure/expressroute/expressroute-howto-coexist-resource-manager',
  },
  'vpn-active-active': {
    title: 'Highly available cross-premises connectivity',
    url: 'https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-highlyavailable',
  },
  'vpn-multi-site': {
    title: 'Connect a VNet to multiple on-premises sites',
    url: 'https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-howto-multi-site-to-site-resource-manager-portal',
  },
  'er-global-reach': {
    title: 'ExpressRoute Global Reach',
    url: 'https://learn.microsoft.com/azure/expressroute/expressroute-global-reach',
  },
  'er-direct': {
    title: 'About ExpressRoute Direct',
    url: 'https://learn.microsoft.com/azure/expressroute/expressroute-erdirect-about',
  },
  'vpn-over-er': {
    title: 'Configure a Site-to-Site VPN over ExpressRoute private peering',
    url: 'https://learn.microsoft.com/azure/expressroute/site-to-site-vpn-over-microsoft-peering',
  },

  // Hub & spoke / landing zone
  'hub-spoke-fw-bastion': {
    title: 'Hub-spoke network topology in Azure',
    url: 'https://learn.microsoft.com/azure/architecture/networking/architecture/hub-spoke',
  },
  'hub-spoke-caf': {
    title: 'Define an Azure network topology',
    url: 'https://learn.microsoft.com/azure/cloud-adoption-framework/ready/azure-best-practices/define-an-azure-network-topology',
  },
  'hub-spoke-multi-region': {
    title: 'Multiregion hub-spoke network topology',
    url: 'https://learn.microsoft.com/azure/architecture/networking/architecture/hub-spoke',
  },
  'landing-zone-connectivity': {
    title: 'Azure landing zone — connectivity to Azure',
    url: 'https://learn.microsoft.com/azure/cloud-adoption-framework/ready/azure-best-practices/connectivity-to-azure',
  },

  // Virtual WAN
  'vwan-secured-hub': {
    title: 'Hub-spoke network topology with Azure Virtual WAN',
    url: 'https://learn.microsoft.com/azure/architecture/networking/architecture/hub-spoke-virtual-wan-architecture',
  },
  'vwan-site-vpn': {
    title: 'Site-to-site connections with Azure Virtual WAN',
    url: 'https://learn.microsoft.com/azure/virtual-wan/virtual-wan-site-to-site-portal',
  },
  'vwan-user-vpn': {
    title: 'About Virtual WAN User VPN (point-to-site)',
    url: 'https://learn.microsoft.com/azure/virtual-wan/point-to-site-concepts',
  },
  'vwan-expressroute': {
    title: 'About Virtual WAN ExpressRoute connections',
    url: 'https://learn.microsoft.com/azure/virtual-wan/virtual-wan-expressroute-portal',
  },
  'vwan-multi-hub': {
    title: 'Architecture of Azure Virtual WAN',
    url: 'https://learn.microsoft.com/azure/virtual-wan/virtual-wan-about',
  },

  // Peering
  'vnet-peering-same-region': {
    title: 'Virtual network peering',
    url: 'https://learn.microsoft.com/azure/virtual-network/virtual-network-peering-overview',
  },
  'vnet-peering-global': {
    title: 'Virtual network peering',
    url: 'https://learn.microsoft.com/azure/virtual-network/virtual-network-peering-overview',
  },

  // Application delivery
  'appgw-waf-vmss': {
    title: 'What is Azure Application Gateway?',
    url: 'https://learn.microsoft.com/azure/application-gateway/overview',
  },
  'appgw-appservice-pe': {
    title: 'Application Gateway Private Link',
    url: 'https://learn.microsoft.com/azure/application-gateway/private-link',
  },
  'appgw-mtls': {
    title: 'Mutual authentication overview with Application Gateway',
    url: 'https://learn.microsoft.com/azure/application-gateway/mutual-authentication-overview',
  },
  'appgw-keyvault': {
    title: 'TLS termination with Key Vault certificates',
    url: 'https://learn.microsoft.com/azure/application-gateway/key-vault-certs',
  },
  'appgw-path-routing': {
    title: 'URL path-based routing overview',
    url: 'https://learn.microsoft.com/azure/application-gateway/url-route-overview',
  },
  'front-door-origin': {
    title: 'Secure origin with Private Link in Azure Front Door',
    url: 'https://learn.microsoft.com/azure/frontdoor/private-link',
  },
  'front-door-apim': {
    title: 'What is Azure Front Door?',
    url: 'https://learn.microsoft.com/azure/frontdoor/front-door-overview',
  },
  'front-door-appservice-standard': {
    title: 'What is Azure Front Door?',
    url: 'https://learn.microsoft.com/azure/frontdoor/front-door-overview',
  },
  'traffic-manager-perf': {
    title: 'Traffic Manager routing methods',
    url: 'https://learn.microsoft.com/azure/traffic-manager/traffic-manager-routing-methods',
  },
  'apim-internal-vnet': {
    title: 'Deploy API Management in an internal virtual network',
    url: 'https://learn.microsoft.com/azure/api-management/api-management-using-with-internal-vnet',
  },
  'webapp-vnet-integration': {
    title: 'Integrate your app with an Azure virtual network',
    url: 'https://learn.microsoft.com/azure/app-service/overview-vnet-integration',
  },

  // Load balancing
  'standard-public-lb': {
    title: 'What is Azure Load Balancer?',
    url: 'https://learn.microsoft.com/azure/load-balancer/load-balancer-overview',
  },
  'standard-internal-lb': {
    title: 'Azure internal load balancer',
    url: 'https://learn.microsoft.com/azure/load-balancer/components',
  },
  'cross-region-lb': {
    title: 'Global Azure Load Balancer',
    url: 'https://learn.microsoft.com/azure/load-balancer/cross-region-overview',
  },
  'gateway-lb-nva': {
    title: 'Gateway Load Balancer overview',
    url: 'https://learn.microsoft.com/azure/load-balancer/gateway-overview',
  },
  'lb-ha-ports': {
    title: 'High availability ports overview',
    url: 'https://learn.microsoft.com/azure/load-balancer/load-balancer-ha-ports-overview',
  },
  'lb-zone-redundant': {
    title: 'Load Balancer and Availability Zones',
    url: 'https://learn.microsoft.com/azure/load-balancer/load-balancer-standard-availability-zones',
  },

  // Private Link / Private Endpoint
  'pe-storage': {
    title: 'What is a private endpoint?',
    url: 'https://learn.microsoft.com/azure/private-link/private-endpoint-overview',
  },
  'pe-sql': {
    title: 'What is a private endpoint?',
    url: 'https://learn.microsoft.com/azure/private-link/private-endpoint-overview',
  },
  'pe-kv': {
    title: 'Integrate Key Vault with Azure Private Link',
    url: 'https://learn.microsoft.com/azure/key-vault/general/private-link-service',
  },
  'private-link-service': {
    title: 'What is Azure Private Link service?',
    url: 'https://learn.microsoft.com/azure/private-link/private-link-service-overview',
  },
  'pe-cognitive': {
    title: 'What is a private endpoint?',
    url: 'https://learn.microsoft.com/azure/private-link/private-endpoint-overview',
  },
  'pe-acr': {
    title: 'Connect privately to a container registry',
    url: 'https://learn.microsoft.com/azure/container-registry/container-registry-private-link',
  },
  'pe-cosmos': {
    title: 'Configure Azure Private Link for an Azure Cosmos DB account',
    url: 'https://learn.microsoft.com/azure/cosmos-db/how-to-configure-private-endpoints',
  },
  'pe-event-hub': {
    title: 'Allow access to Azure Event Hubs namespaces via private endpoints',
    url: 'https://learn.microsoft.com/azure/event-hubs/private-link-service',
  },
  'pe-service-bus': {
    title: 'Allow access to Azure Service Bus namespaces via private endpoints',
    url: 'https://learn.microsoft.com/azure/service-bus-messaging/private-link-service',
  },
  'pe-ampls': {
    title: 'Use Azure Private Link to connect networks to Azure Monitor',
    url: 'https://learn.microsoft.com/azure/azure-monitor/logs/private-link-security',
  },

  // Firewall & security
  'firewall-spoke-to-spoke': {
    title: 'What is Azure Firewall?',
    url: 'https://learn.microsoft.com/azure/firewall/overview',
  },
  'firewall-premium-tls': {
    title: 'Azure Firewall Premium features',
    url: 'https://learn.microsoft.com/azure/firewall/premium-features',
  },
  'firewall-forced-tunneling': {
    title: 'Azure Firewall forced tunneling',
    url: 'https://learn.microsoft.com/azure/firewall/forced-tunneling',
  },
  'firewall-dnat': {
    title: 'Filter inbound traffic with Azure Firewall DNAT',
    url: 'https://learn.microsoft.com/azure/firewall/tutorial-firewall-dnat',
  },
  'firewall-basic': {
    title: 'Azure Firewall Basic features',
    url: 'https://learn.microsoft.com/azure/firewall/basic-features',
  },
  'firewall-ip-groups': {
    title: 'IP Groups in Azure Firewall',
    url: 'https://learn.microsoft.com/azure/firewall/ip-groups',
  },
  'nsg-asg-segmentation': {
    title: 'Network security groups',
    url: 'https://learn.microsoft.com/azure/virtual-network/network-security-groups-overview',
  },
  'ddos-standard': {
    title: 'Azure DDoS Protection overview',
    url: 'https://learn.microsoft.com/azure/ddos-protection/ddos-protection-overview',
  },

  // DNS
  'dns-private-resolver': {
    title: 'Azure DNS Private Resolver architecture',
    url: 'https://learn.microsoft.com/azure/architecture/networking/architecture/azure-dns-private-resolver',
  },
  'private-dns-zone-pe': {
    title: 'Azure Private Endpoint DNS configuration',
    url: 'https://learn.microsoft.com/azure/private-link/private-endpoint-dns',
  },
  'dns-split-brain': {
    title: 'What is Azure Private DNS?',
    url: 'https://learn.microsoft.com/azure/dns/private-dns-overview',
  },
  'dns-onprem-forwarder': {
    title: 'Azure Private Endpoint DNS configuration',
    url: 'https://learn.microsoft.com/azure/private-link/private-endpoint-dns',
  },

  // NAT & egress
  'nat-gateway-outbound': {
    title: 'What is Azure NAT Gateway?',
    url: 'https://learn.microsoft.com/azure/nat-gateway/nat-overview',
  },
  'nat-per-subnet': {
    title: 'Design virtual networks with NAT gateway',
    url: 'https://learn.microsoft.com/azure/nat-gateway/nat-gateway-resource',
  },

  // Remote access
  'bastion-jumpbox': {
    title: 'What is Azure Bastion?',
    url: 'https://learn.microsoft.com/azure/bastion/bastion-overview',
  },

  // Kubernetes
  'aks-private-cluster': {
    title: 'Create a private Azure Kubernetes Service cluster',
    url: 'https://learn.microsoft.com/azure/aks/private-clusters',
  },
  'aks-agic': {
    title: 'What is Application Gateway Ingress Controller?',
    url: 'https://learn.microsoft.com/azure/application-gateway/ingress-controller-overview',
  },
  'aks-firewall-egress': {
    title: 'Control egress traffic for cluster nodes in AKS',
    url: 'https://learn.microsoft.com/azure/aks/limit-egress-traffic',
  },
  'aks-cni-overlay': {
    title: 'Configure Azure CNI Overlay networking in AKS',
    url: 'https://learn.microsoft.com/azure/aks/azure-cni-overlay',
  },

  // Segmentation & routing
  'udr-nva': {
    title: 'Virtual network traffic routing',
    url: 'https://learn.microsoft.com/azure/virtual-network/virtual-networks-udr-overview',
  },
  'route-server-nva-bgp': {
    title: 'What is Azure Route Server?',
    url: 'https://learn.microsoft.com/azure/route-server/overview',
  },
  'nva-ha-cluster': {
    title: 'Deploy highly available NVAs',
    url: 'https://learn.microsoft.com/azure/architecture/networking/guide/network-virtual-appliance-high-availability',
  },
  'n-tier-nsg-segmented': {
    title: 'Network security groups',
    url: 'https://learn.microsoft.com/azure/virtual-network/network-security-groups-overview',
  },

  // Multi-region & DR
  'multi-region-active-active': {
    title: 'What is Azure Front Door?',
    url: 'https://learn.microsoft.com/azure/frontdoor/front-door-overview',
  },
  'multi-region-active-passive': {
    title: 'Traffic Manager routing methods',
    url: 'https://learn.microsoft.com/azure/traffic-manager/traffic-manager-routing-methods',
  },

  // Monitoring
  'network-watcher-connection-monitor': {
    title: 'Connection monitor overview',
    url: 'https://learn.microsoft.com/azure/network-watcher/connection-monitor-overview',
  },
  'nsg-flow-logs': {
    title: 'Traffic analytics overview',
    url: 'https://learn.microsoft.com/azure/network-watcher/traffic-analytics',
  },
};

for (const t of TEMPLATES) {
  const source = TEMPLATE_SOURCES[t.id];
  if (source) t.source = source;
}

/** Simple search: substring match against name, category, description, keywords. */
export function searchTemplates(query: string): Template[] {
  const q = query.trim().toLowerCase();
  if (!q) return TEMPLATES;
  return TEMPLATES.filter((t) => {
    if (t.name.toLowerCase().includes(q)) return true;
    if (t.category.toLowerCase().includes(q)) return true;
    if (t.description.toLowerCase().includes(q)) return true;
    if (t.source && t.source.title.toLowerCase().includes(q)) return true;
    return t.keywords.some((k) => k.toLowerCase().includes(q));
  });
}
