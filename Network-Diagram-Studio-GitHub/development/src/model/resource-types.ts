// Catalog of resource types selectable in the diagram.
// Each entry maps a topology `type` slug to an Azure icon and its editable fields.
// Adding a new type only requires appending to RESOURCE_TYPES.

export interface FieldDef {
  key: string;
  label: string;
  kind: 'text' | 'textarea' | 'select';
  options?: string[];
  placeholder?: string;
}

export interface ResourceType {
  /** Slug used in the diagram JSON `type`. */
  slug: string;
  label: string;
  category: string;
  /** Icon manifest id (from src/icons/manifest.ts). */
  iconId: string;
  defaultName: string;
  fields: FieldDef[];
  /** When true, this type renders as a container/group node. */
  isGroup?: boolean;
  color?: string;
}

/** Field sets shared across the on-premises catalog. */
const F_MGMT: FieldDef[] = [
  { key: 'model', label: 'Model', kind: 'text' },
  { key: 'mgmtIp', label: 'Management IP', kind: 'text' },
];
const F_HOST: FieldDef[] = [
  { key: 'os', label: 'OS', kind: 'text' },
  { key: 'ip', label: 'IP address', kind: 'text' },
];
const F_WAN: FieldDef[] = [
  { key: 'provider', label: 'Provider', kind: 'text' },
  { key: 'bandwidth', label: 'Bandwidth', kind: 'text', placeholder: '1 Gbps' },
];
const F_SITE: FieldDef[] = [{ key: 'site', label: 'Site', kind: 'text' }];
const F_NONE: FieldDef[] = [];

/** Field sets shared across the Microsoft 365 catalog. */
const F_M365: FieldDef[] = [
  { key: 'tenant', label: 'Tenant', kind: 'text', placeholder: 'contoso.onmicrosoft.com' },
  { key: 'endpoint', label: 'Endpoint / FQDN', kind: 'text', placeholder: 'outlook.office365.com' },
  // Microsoft publishes every Microsoft 365 endpoint in one of these three
  // categories, and the category is what decides whether traffic may be
  // proxied, must bypass inspection, or should ride ExpressRoute — which is
  // exactly the question a hybrid connectivity case turns on.
  { key: 'netCategory', label: 'Network category', kind: 'select', options: ['Optimize', 'Allow', 'Default'] },
];
const F_M365_ID: FieldDef[] = [
  { key: 'tenant', label: 'Tenant', kind: 'text', placeholder: 'contoso.onmicrosoft.com' },
  { key: 'tenantId', label: 'Tenant ID', kind: 'text' },
];
/** On-premises halves of a hybrid Microsoft 365 deployment. */
const F_M365_HYBRID: FieldDef[] = [
  { key: 'host', label: 'Host', kind: 'text' },
  { key: 'ip', label: 'IP address', kind: 'text' },
  { key: 'version', label: 'Version', kind: 'text' },
];

/**
 * Vendor-neutral on-premises symbols, hand-authored under
 * `src/icons/custom-svg/On-premises/` (see `scripts/author-onprem-icons.mjs`).
 *
 * These exist because the official Azure V24 set — comprehensive as it is
 * for cloud-native services — has no generic router, Layer 2 switch, patch
 * panel, MPLS cloud, IP phone or UPS. Those are precisely the symbols a
 * *hybrid* connectivity diagram needs on the customer side of the demarc,
 * which is where most ExpressRoute / Site-to-Site VPN troubleshooting
 * actually happens.
 *
 * Tuple order: [icon slug, label, default node name, fields].
 * The `onprem-` slug prefix keeps them clear of the Azure resource slugs.
 */
const ONPREM_TYPES: ResourceType[] = (
  [
    // ---- Routing & switching
    ['router', 'Router', 'Router', F_MGMT],
    ['edge-router', 'Edge Router', 'Edge router', F_MGMT],
    ['customer-edge-router', 'CE Router', 'CE router', F_MGMT],
    ['provider-edge-router', 'PE Router', 'PE router', F_MGMT],
    ['switch', 'Switch (L2)', 'Switch', F_MGMT],
    ['l3-switch', 'Switch (L3)', 'L3 switch', F_MGMT],
    ['core-switch', 'Core Switch', 'Core switch', F_MGMT],
    ['switch-stack', 'Switch Stack', 'Switch stack', F_MGMT],
    ['tor-switch', 'Top-of-Rack Switch', 'ToR switch', F_MGMT],
    ['hub', 'Hub', 'Hub', F_NONE],
    ['bridge', 'Bridge', 'Bridge', F_NONE],
    ['modem', 'Modem / CPE', 'Modem', F_MGMT],
    ['patch-panel', 'Patch Panel', 'Patch panel', F_SITE],
    ['nic', 'NIC', 'NIC', [{ key: 'mac', label: 'MAC address', kind: 'text' }]],
    ['nat-device', 'NAT Device', 'NAT device', F_MGMT],

    // ---- Security
    ['firewall', 'Firewall', 'Firewall', F_MGMT],
    ['next-gen-firewall', 'Next-Gen Firewall', 'NGFW', F_MGMT],
    ['ids-ips', 'IDS / IPS', 'IDS/IPS', F_MGMT],
    ['proxy', 'Proxy Server', 'Proxy', F_HOST],
    ['vpn-concentrator', 'VPN Concentrator', 'VPN concentrator', F_MGMT],
    ['ipsec-tunnel', 'IPsec Tunnel', 'IPsec tunnel', [
      { key: 'peer', label: 'Peer IP', kind: 'text' },
      { key: 'ike', label: 'IKE version', kind: 'select', options: ['IKEv1', 'IKEv2'] },
    ]],
    ['dmz', 'DMZ', 'DMZ', [{ key: 'cidr', label: 'CIDR', kind: 'text' }]],
    ['radius-server', 'RADIUS Server', 'RADIUS', F_HOST],

    // ---- WAN / carrier
    ['wan-cloud', 'WAN Cloud', 'WAN', F_WAN],
    ['internet-cloud', 'Internet', 'Internet', F_NONE],
    ['mpls-cloud', 'MPLS Cloud', 'MPLS', F_WAN],
    ['pstn-cloud', 'PSTN', 'PSTN', F_WAN],
    ['telco-carrier', 'Carrier Network', 'Carrier', F_WAN],
    ['leased-line', 'Leased Line', 'Leased line', F_WAN],
    ['demarcation-point', 'Demarcation Point', 'Demarc', F_SITE],
    ['cross-connect', 'Cross-Connect', 'Cross-connect', F_SITE],
    ['sd-wan', 'SD-WAN Appliance', 'SD-WAN', F_MGMT],
    ['cell-tower', 'Cell Tower / 5G', 'Cell tower', F_WAN],
    ['satellite-dish', 'Satellite Link', 'Satellite', F_WAN],

    // ---- ExpressRoute / hybrid edge
    ['msee', 'MSEE', 'MSEE', [
      { key: 'peeringLocation', label: 'Peering location', kind: 'text' },
      { key: 'asn', label: 'ASN', kind: 'text', placeholder: '12076' },
    ]],
    ['peering-location', 'Peering Location', 'Peering location', [
      { key: 'facility', label: 'Facility', kind: 'text', placeholder: 'Equinix TY4' },
    ]],

    // ---- Servers by role
    ['rack-server', 'Rack Server', 'Server', F_HOST],
    ['tower-server', 'Tower Server', 'Server', F_HOST],
    ['blade-server', 'Blade Chassis', 'Blade chassis', F_HOST],
    ['mainframe', 'Mainframe', 'Mainframe', F_HOST],
    ['hypervisor', 'Hypervisor Host', 'Hypervisor', [
      { key: 'hypervisor', label: 'Hypervisor', kind: 'select', options: ['Hyper-V', 'VMware ESXi', 'KVM', 'Xen'] },
      { key: 'ip', label: 'IP address', kind: 'text' },
    ]],
    ['domain-controller', 'Domain Controller', 'DC', F_HOST],
    ['adfs-server', 'AD FS Server', 'AD FS', F_HOST],
    ['dns-server', 'DNS Server', 'DNS', F_HOST],
    ['dhcp-server', 'DHCP Server', 'DHCP', F_HOST],
    ['ntp-server', 'NTP Server', 'NTP', F_HOST],
    ['mail-server', 'Mail Server', 'Mail', F_HOST],
    ['web-server', 'Web Server', 'Web', F_HOST],
    ['file-server', 'File Server', 'File server', F_HOST],
    ['print-server', 'Print Server', 'Print server', F_HOST],
    ['database-server', 'Database Server', 'Database', F_HOST],
    ['backup-server', 'Backup Server', 'Backup', F_HOST],
    ['jump-box', 'Jump Box', 'Jump box', F_HOST],

    // ---- Storage
    ['nas', 'NAS', 'NAS', F_HOST],
    ['san', 'SAN', 'SAN', F_HOST],
    ['tape-library', 'Tape Library', 'Tape library', F_NONE],
    ['disk-array', 'Disk Array', 'Disk array', F_NONE],

    // ---- Facility
    ['datacenter', 'Datacenter', 'Datacenter', F_SITE],
    ['branch-office', 'Branch Office', 'Branch', F_SITE],
    ['corporate-hq', 'Corporate HQ', 'HQ', F_SITE],
    ['rack', 'Rack', 'Rack', F_SITE],
    ['ups', 'UPS', 'UPS', F_NONE],
    ['pdu', 'PDU', 'PDU', F_NONE],
    ['kvm', 'KVM Switch', 'KVM', F_NONE],

    // ---- Wireless
    ['access-point', 'Wireless AP', 'AP', F_MGMT],
    ['wireless-controller', 'Wireless Controller', 'WLC', F_MGMT],
    ['antenna', 'Antenna', 'Antenna', F_NONE],

    // ---- End-user devices
    ['workstation', 'Workstation', 'Workstation', F_HOST],
    ['thin-client', 'Thin Client', 'Thin client', F_HOST],
    ['ip-phone', 'IP Phone', 'IP phone', [{ key: 'ext', label: 'Extension', kind: 'text' }]],
    ['pbx-voice-gateway', 'PBX / Voice Gateway', 'PBX', F_MGMT],
    ['printer', 'Printer', 'Printer', [{ key: 'ip', label: 'IP address', kind: 'text' }]],
    ['scanner', 'Scanner', 'Scanner', F_NONE],

    // ---- Load balancing & ops
    ['load-balancer', 'Load Balancer (HW)', 'Load balancer', F_MGMT],
    ['monitoring', 'Monitoring / NMS', 'NMS', F_HOST],
    ['syslog', 'Syslog / SIEM', 'Syslog', F_HOST],
    ['jump-host-console', 'Console / CLI', 'Console', F_NONE],
  ] as [string, string, string, FieldDef[]][]
).map(([icon, label, defaultName, fields]) => ({
  slug: `onprem-${icon}`,
  label,
  category: 'On-premises',
  iconId: `on-premises--${icon}`,
  defaultName,
  fields,
}));

/**
 * Microsoft 365 workloads.
 *
 * **Where the artwork comes from.** These are original glyphs, drawn by
 * `scripts/author-m365-icons.mjs` in the same house style as the
 * On-premises set. Microsoft does not publish the SharePoint / OneDrive /
 * Teams / Copilot brand marks for redistribution, and the icon pack it *does*
 * publish contains no product marks at all — see `LICENSE-ICONS.md`. Each
 * glyph uses the product's conventional functional motif instead.
 *
 * Where the Azure V24 set already ships a genuine product icon — Intune,
 * Power BI, Power Platform, Entra Connect, MFA, Application Proxy — that icon
 * is used in preference, so the most recognisable art always wins.
 *
 * Tuple order: [slug suffix, label, icon id, default node name, fields].
 * Slugs are prefixed `m365-`, so a suffix must NOT itself start with `m365-`.
 */
const M365_TYPES: ResourceType[] = (
  [
    // ---- Mail
    ['exchange-online', 'Exchange Online', 'microsoft-365--exchange-online', 'Exchange Online', F_M365],
    ['outlook', 'Outlook', 'microsoft-365--outlook', 'Outlook', F_M365],
    ['eop', 'Exchange Online Protection', 'microsoft-365--exchange-online-protection', 'EOP', F_M365],
    ['exchange-hybrid', 'Exchange Hybrid Server', 'microsoft-365--exchange-hybrid', 'Hybrid server', F_M365_HYBRID],

    // ---- Files & content
    ['sharepoint', 'SharePoint Online', 'microsoft-365--sharepoint', 'SharePoint Online', F_M365],
    ['onedrive', 'OneDrive for Business', 'microsoft-365--onedrive', 'OneDrive', F_M365],
    ['onenote', 'OneNote', 'microsoft-365--onenote', 'OneNote', F_M365],
    ['loop', 'Microsoft Loop', 'microsoft-365--loop', 'Loop', F_M365],

    // ---- Teams
    ['teams', 'Microsoft Teams', 'microsoft-365--teams', 'Microsoft Teams', F_M365],
    ['teams-chat', 'Teams Chat', 'microsoft-365--teams-chat', 'Teams chat', F_M365],
    ['teams-meeting', 'Teams Meetings', 'microsoft-365--teams-meeting', 'Teams meeting', F_M365],
    ['teams-phone', 'Teams Phone', 'microsoft-365--teams-phone', 'Teams Phone', F_M365],
    ['teams-room', 'Teams Room', 'microsoft-365--teams-room', 'Teams Room', F_M365_HYBRID],

    // ---- Apps & AI
    ['apps', 'Microsoft 365 Apps', 'microsoft-365--apps', 'Microsoft 365 Apps', F_M365],
    ['copilot', 'Microsoft 365 Copilot', 'microsoft-365--copilot', 'Copilot', F_M365],
    ['planner', 'Microsoft Planner', 'microsoft-365--planner', 'Planner', F_M365],
    ['forms', 'Microsoft Forms', 'microsoft-365--forms', 'Forms', F_M365],
    ['stream', 'Microsoft Stream', 'microsoft-365--stream', 'Stream', F_M365],
    ['bookings', 'Microsoft Bookings', 'microsoft-365--bookings', 'Bookings', F_M365],
    ['viva', 'Microsoft Viva', 'microsoft-365--viva', 'Viva', F_M365],
    ['viva-engage', 'Viva Engage', 'microsoft-365--viva-engage', 'Viva Engage', F_M365],

    // ---- Power Platform
    ['power-bi', 'Power BI', 'analytics--power-bi-embedded', 'Power BI', F_M365],
    ['power-automate', 'Power Automate', 'microsoft-365--power-automate', 'Power Automate', F_M365],
    ['power-apps', 'Power Apps', 'microsoft-365--power-apps', 'Power Apps', F_M365],

    // ---- Identity
    ['entra-id', 'Microsoft Entra ID', 'microsoft-365--entra-id', 'Entra ID', F_M365_ID],
    ['entra-connect', 'Entra Connect', 'identity--entra-connect', 'Entra Connect', F_M365_HYBRID],
    ['entra-cloud-sync', 'Entra Cloud Sync', 'identity--entra-connect-sync', 'Cloud Sync', F_M365_HYBRID],
    ['conditional-access', 'Conditional Access', 'microsoft-365--conditional-access', 'Conditional Access', F_M365_ID],
    ['mfa', 'Multifactor Authentication', 'microsoft-365--mfa', 'MFA', F_M365_ID],
    ['app-proxy', 'Entra Application Proxy', 'identity--api-proxy', 'App Proxy', F_M365_HYBRID],
    ['gsa', 'Global Secure Access', 'identity--entra-global-secure-access', 'Global Secure Access', F_M365_ID],

    // ---- Security, compliance & management
    ['defender-o365', 'Defender for Office 365', 'microsoft-365--defender-o365', 'Defender for Office 365', F_M365],
    ['defender-cloud-apps', 'Defender for Cloud Apps', 'microsoft-365--defender-cloud-apps', 'Defender for Cloud Apps', F_M365],
    ['purview', 'Microsoft Purview', 'microsoft-365--purview', 'Purview', F_M365],
    ['dlp', 'Data Loss Prevention', 'microsoft-365--dlp', 'DLP policy', F_M365],
    ['intune', 'Microsoft Intune', 'intune--intune', 'Intune', F_M365_ID],
    ['admin', 'Microsoft 365 Admin Center', 'microsoft-365--admin', 'Admin center', F_M365_ID],
    ['service-health', 'Service Health', 'microsoft-365--health', 'Service health', F_M365_ID],

    // ---- Connectivity
    ['endpoints', 'Microsoft 365 Endpoints', 'microsoft-365--endpoints', 'Microsoft 365 endpoints', F_M365],
  ] as [string, string, string, string, FieldDef[]][]
).map(([slug, label, iconId, defaultName, fields]) => ({
  slug: `m365-${slug}`,
  label,
  category: 'Microsoft 365',
  iconId,
  defaultName,
  fields,
}));

export const RESOURCE_TYPES: ResourceType[] = [
  { slug: 'group-region',       label: 'Region',              category: 'Group',       iconId: 'general--region-management',              defaultName: 'eastus',        fields: [{ key: 'region', label: 'Region', kind: 'text' }], isGroup: true, color: '#94a3b8' },
  { slug: 'group-subscription', label: 'Subscription',        category: 'Group',       iconId: 'general--subscriptions',                  defaultName: 'Subscription',  fields: [{ key: 'subscriptionId', label: 'Subscription ID', kind: 'text' }], isGroup: true, color: '#94a3b8' },
  { slug: 'group-rg',           label: 'Resource Group',      category: 'Group',       iconId: 'general--resource-groups',                defaultName: 'rg-example',    fields: [{ key: 'resourceGroup', label: 'RG name', kind: 'text' }], isGroup: true, color: '#94a3b8' },
  { slug: 'group-onprem',       label: 'On-premises',         category: 'Group',       iconId: 'networking--on-premises-data-gateways',   defaultName: 'On-premises',   fields: [{ key: 'site', label: 'Site', kind: 'text' }], isGroup: true, color: '#64748b' },
  { slug: 'group-vnet',         label: 'Virtual Network',     category: 'Group',       iconId: 'networking--virtual-networks',            defaultName: 'vnet',
    fields: [
      { key: 'cidr', label: 'CIDR', kind: 'text', placeholder: '10.0.0.0/16' },
      { key: 'region', label: 'Region', kind: 'text' },
    ], isGroup: true, color: '#0078d4' },
  { slug: 'group-subnet',       label: 'Subnet',              category: 'Group',       iconId: 'networking--subnet',                      defaultName: 'subnet',
    fields: [{ key: 'cidr', label: 'CIDR', kind: 'text', placeholder: '10.0.1.0/24' }],
    isGroup: true, color: '#0078d4' },

  // ==== External ====
  { slug: 'user',      label: 'User / Client',  category: 'External', iconId: 'identity--users',                defaultName: 'User',     fields: [{ key: 'location', label: 'Location', kind: 'text' }] },
  { slug: 'internet',  label: 'Internet',       category: 'External', iconId: 'general--browser',               defaultName: 'Internet', fields: [] },

  // ==== Networking ====
  // Hand-ordered, v0.9.80. Declaration order IS the palette order inside a
  // category (DemoPalette deliberately does not sort — see the note there),
  // so this list is the answer to "what does a network diagram put down
  // first". The old order led with Application Gateway and AppGW for
  // Containers and left NSG, Route Table, Network Interface and Private
  // Endpoint in the fourth and fifth rows.
  //
  //   1-8   the parts almost every Azure network drawing contains
  //   9-12  hybrid and egress edges
  //   13-20 access, DNS, and the policy objects those four attach to
  //   21-30 the long tail, rarest last
{ slug: 'nsg', label: 'Network Security Group', category: 'Networking', iconId: 'networking--network-security-groups', defaultName: 'nsg-example', fields: [] },
{ slug: 'udr', label: 'Route Table (UDR)', category: 'Networking', iconId: 'networking--route-tables', defaultName: 'rt-example', fields: [] },
{ slug: 'firewall', label: 'Azure Firewall', category: 'Networking', iconId: 'networking--firewalls', defaultName: 'afw-example',
    fields: [
      { key: 'sku', label: 'SKU', kind: 'select', options: ['Standard', 'Premium', 'Basic'] },
      { key: 'privateIp', label: 'Private IP', kind: 'text' },
      { key: 'firewallPolicy', label: 'Firewall policy', kind: 'text' },
    ]
  },
{ slug: 'lb', label: 'Load Balancer', category: 'Networking', iconId: 'networking--load-balancers', defaultName: 'lb-example',
    fields: [
      { key: 'sku', label: 'SKU', kind: 'select', options: ['Standard', 'Basic', 'Gateway'] },
      { key: 'type', label: 'Type', kind: 'select', options: ['Public', 'Internal'] },
      { key: 'frontendIp', label: 'Frontend IP', kind: 'text' },
    ]
  },
{ slug: 'appgw', label: 'Application Gateway', category: 'Networking', iconId: 'networking--application-gateways', defaultName: 'agw-example',
    fields: [
      { key: 'sku', label: 'SKU', kind: 'select', options: ['Standard_v2', 'WAF_v2'] },
      { key: 'capacity', label: 'Capacity', kind: 'text', placeholder: '1-10' },
      { key: 'frontendIp', label: 'Frontend IP', kind: 'text' },
      { key: 'wafPolicy', label: 'WAF policy', kind: 'text' },
    ]
  },
{ slug: 'pip', label: 'Public IP', category: 'Networking', iconId: 'networking--public-ip-addresses', defaultName: 'pip-example',
    fields: [
      { key: 'sku', label: 'SKU', kind: 'select', options: ['Basic', 'Standard'] },
      { key: 'ip', label: 'Address', kind: 'text' },
      { key: 'assignment', label: 'Assignment', kind: 'select', options: ['Static', 'Dynamic'] },
    ]
  },
{ slug: 'nic', label: 'Network Interface', category: 'Networking', iconId: 'networking--network-interfaces', defaultName: 'nic-example',
    fields: [
      { key: 'privateIp', label: 'Private IP', kind: 'text' },
      { key: 'publicIp', label: 'Public IP', kind: 'text' },
    ]
  },
{ slug: 'private-endpoint', label: 'Private Endpoint', category: 'Networking', iconId: 'networking--private-link', defaultName: 'pe-example',
    fields: [
      { key: 'targetResource', label: 'Target resource', kind: 'text' },
      { key: 'privateIp', label: 'Private IP', kind: 'text' },
    ]
  },
{ slug: 'vpn-gw', label: 'VPN Gateway', category: 'Networking', iconId: 'networking--virtual-network-gateways', defaultName: 'vpngw-example',
    fields: [
      { key: 'sku', label: 'SKU', kind: 'text' },
      { key: 'type', label: 'Type', kind: 'select', options: ['RouteBased', 'PolicyBased'] },
      { key: 'publicIp', label: 'Public IP', kind: 'text' },
      { key: 'asn', label: 'ASN', kind: 'text' },
    ]
  },
{ slug: 'er-circuit', label: 'ExpressRoute Circuit', category: 'Networking', iconId: 'networking--expressroute-circuits', defaultName: 'er-example',
    fields: [
      { key: 'sku', label: 'SKU', kind: 'select', options: ['Standard', 'Premium'] },
      { key: 'bandwidth', label: 'Bandwidth', kind: 'text' },
      { key: 'peeringLocation', label: 'Peering location', kind: 'text' },
      { key: 'serviceProvider', label: 'Service provider', kind: 'text' },
    ]
  },
{ slug: 'er-gw', label: 'ExpressRoute Gateway', category: 'Networking', iconId: 'networking--virtual-network-gateways', defaultName: 'ergw-example',
    fields: [
      { key: 'sku', label: 'SKU', kind: 'text' },
      { key: 'scaleUnits', label: 'Scale units', kind: 'text' },
    ]
  },
{ slug: 'nat', label: 'NAT Gateway', category: 'Networking', iconId: 'networking--nat', defaultName: 'nat-example', fields: [] },
{ slug: 'bastion', label: 'Azure Bastion', category: 'Networking', iconId: 'networking--bastions', defaultName: 'bastion-example', fields: [] },
{ slug: 'dns-zone', label: 'DNS Zone', category: 'Networking', iconId: 'networking--dns-zones', defaultName: 'contoso.com',
    fields: [{ key: 'kind', label: 'Kind', kind: 'select', options: ['Public', 'Private'] }]
  },
{ slug: 'front-door', label: 'Front Door / CDN', category: 'Networking', iconId: 'networking--front-door-and-cdn-profiles', defaultName: 'fd-example',
    fields: [
      { key: 'sku', label: 'SKU', kind: 'select', options: ['Standard', 'Premium'] },
      { key: 'endpoint', label: 'Endpoint', kind: 'text' },
    ]
  },
{ slug: 'traffic-manager', label: 'Traffic Manager', category: 'Networking', iconId: 'networking--traffic-manager-profiles', defaultName: 'tm-example',
    fields: [{ key: 'routing', label: 'Routing method', kind: 'select', options: ['Performance', 'Priority', 'Weighted', 'Geographic', 'MultiValue', 'Subnet'] }]
  },
{ slug: 'local-gw', label: 'Local Network Gateway', category: 'Networking', iconId: 'networking--local-network-gateways', defaultName: 'lng-example',
    fields: [
      { key: 'publicIp', label: 'Public IP', kind: 'text' },
      { key: 'addressSpace', label: 'Address space', kind: 'text' },
    ]
  },
{ slug: 'connection', label: 'Connection', category: 'Networking', iconId: 'networking--connections', defaultName: 'conn-example',
    fields: [
      { key: 'type', label: 'Type', kind: 'select', options: ['IPsec', 'ExpressRoute', 'VNet2VNet', 'VPNClient'] },
      { key: 'psk', label: 'PSK set?', kind: 'select', options: ['Yes', 'No'] },
    ]
  },
{ slug: 'firewall-policy', label: 'Firewall Policy', category: 'Networking', iconId: 'networking--azure-firewall-policy', defaultName: 'afwp-example', fields: [] },
{ slug: 'waf-policy', label: 'WAF Policy', category: 'Networking', iconId: 'networking--web-application-firewall-policies-waf', defaultName: 'wafpol-example',
    fields: [
      { key: 'mode', label: 'Mode', kind: 'select', options: ['Detection', 'Prevention'] },
      { key: 'ruleset', label: 'Managed ruleset', kind: 'text', placeholder: 'OWASP 3.2' },
    ]
  },
{ slug: 'private-link-service', label: 'Private Link Service', category: 'Networking', iconId: 'networking--private-link-service', defaultName: 'pls-example', fields: [] },
{ slug: 'vwan', label: 'Virtual WAN', category: 'Networking', iconId: 'networking--virtual-wans', defaultName: 'vwan-example', fields: [] },
{ slug: 'vwan-hub', label: 'Virtual WAN Hub', category: 'Networking', iconId: 'networking--virtual-wan-hub', defaultName: 'vhub-example',
    fields: [
      { key: 'region', label: 'Region', kind: 'text' },
      { key: 'addressPrefix', label: 'Address prefix', kind: 'text' },
    ]
  },
{ slug: 'dns-resolver', label: 'DNS Private Resolver', category: 'Networking', iconId: 'networking--dns-private-resolver', defaultName: 'dnspr-example', fields: [] },
{ slug: 'network-watcher', label: 'Network Watcher', category: 'Networking', iconId: 'networking--network-watcher', defaultName: 'nw-example', fields: [] },
{ slug: 'ip-group', label: 'IP Group', category: 'Networking', iconId: 'networking--ip-groups', defaultName: 'ipg-example', fields: [] },
{ slug: 'ddos-plan', label: 'DDoS Protection Plan', category: 'Networking', iconId: 'networking--ddos-protection-plans', defaultName: 'ddos-example', fields: [] },
{ slug: 'nva', label: 'Network Virtual Appliance', category: 'Networking', iconId: 'networking--vnet-appliance', defaultName: 'nva-example',
    fields: [
      { key: 'vendor', label: 'Vendor', kind: 'text' },
      { key: 'model', label: 'Model', kind: 'text' },
    ]
  },
{ slug: 'pip-prefix', label: 'Public IP Prefix', category: 'Networking', iconId: 'networking--public-ip-prefixes', defaultName: 'pfx-example', fields: [] },
{ slug: 'appgw-containers', label: 'AppGW for Containers', category: 'Networking', iconId: 'networking--application-gateway-containers', defaultName: 'agc-example', fields: [] },

  // ==== Compute ====
  { slug: 'vm', label: 'Virtual Machine', category: 'Compute', iconId: 'compute--virtual-machine', defaultName: 'vm-example',
    fields: [
      { key: 'os', label: 'OS', kind: 'text' },
      { key: 'size', label: 'Size', kind: 'text', placeholder: 'Standard_D2s_v5' },
      { key: 'privateIp', label: 'Private IP', kind: 'text' },
    ]
  },
  { slug: 'vmss', label: 'VM Scale Set', category: 'Compute', iconId: 'compute--vm-scale-sets', defaultName: 'vmss-example', fields: [] },
  { slug: 'aks', label: 'Kubernetes Service (AKS)', category: 'Compute', iconId: 'containers--kubernetes-services', defaultName: 'aks-example',
    fields: [
      { key: 'version', label: 'K8s version', kind: 'text' },
      { key: 'nodeCount', label: 'Node count', kind: 'text' },
    ]
  },
  { slug: 'container-instance', label: 'Container Instance', category: 'Compute', iconId: 'containers--container-instances', defaultName: 'ci-example', fields: [] },
  { slug: 'container-registry', label: 'Container Registry', category: 'Compute', iconId: 'containers--container-registries', defaultName: 'acr-example', fields: [] },
  { slug: 'app-service', label: 'App Service', category: 'Compute', iconId: 'web--app-services', defaultName: 'as-example',
    fields: [
      { key: 'plan', label: 'Plan', kind: 'text' },
      { key: 'kind', label: 'Kind', kind: 'select', options: ['Web', 'Api', 'Function', 'Container'] },
    ]
  },
  { slug: 'function-app', label: 'Function App', category: 'Compute', iconId: 'compute--function-apps', defaultName: 'fa-example', fields: [] },
  { slug: 'api-management', label: 'API Management', category: 'Compute', iconId: 'web--api-management-services', defaultName: 'apim-example',
    fields: [{ key: 'sku', label: 'SKU', kind: 'select', options: ['Consumption', 'Developer', 'Basic', 'Standard', 'Premium', 'Isolated'] }]
  },

  // ==== Storage ====
  { slug: 'storage', label: 'Storage Account', category: 'Storage', iconId: 'storage--storage-accounts', defaultName: 'st-example',
    fields: [
      { key: 'kind', label: 'Kind', kind: 'select', options: ['StorageV2', 'BlockBlobStorage', 'FileStorage'] },
      { key: 'sku', label: 'SKU', kind: 'text', placeholder: 'Standard_LRS' },
    ]
  },

  // ==== Databases ====
  { slug: 'sql-db', label: 'Azure SQL Database', category: 'Database', iconId: 'databases--sql-database', defaultName: 'sql-example', fields: [] },
  { slug: 'cosmos', label: 'Cosmos DB', category: 'Database', iconId: 'databases--azure-cosmos-db', defaultName: 'cosmos-example', fields: [] },

  // ==== Security / Identity ====
  { slug: 'key-vault', label: 'Key Vault', category: 'Security', iconId: 'security--key-vaults', defaultName: 'kv-example', fields: [] },
  { slug: 'asg', label: 'Application Security Group', category: 'Security', iconId: 'security--application-security-groups', defaultName: 'asg-example', fields: [] },

  // ==== People & UI (custom stick-figure + UI icons authored under
  //      src/icons/custom-svg/People & UI/, mapped as resource types
  //      here so they surface in the Resources palette alongside Azure
  //      services.) ====
  { slug: 'people-client',       label: 'Client',       category: 'People & UI', iconId: 'people-ui--client',       defaultName: 'Client',       fields: [{ key: 'location', label: 'Location', kind: 'text' }] },
  { slug: 'people-admin',        label: 'Admin',        category: 'People & UI', iconId: 'people-ui--admin',        defaultName: 'Admin',        fields: [{ key: 'role', label: 'Role', kind: 'text' }] },
  { slug: 'people-azure-portal', label: 'Azure Portal', category: 'People & UI', iconId: 'people-ui--azure-portal', defaultName: 'Azure Portal', fields: [{ key: 'url', label: 'URL', kind: 'text' }] },
  { slug: 'people-terminal',     label: 'Terminal',     category: 'People & UI', iconId: 'people-ui--terminal',     defaultName: 'Terminal',     fields: [{ key: 'shell', label: 'Shell', kind: 'text', placeholder: 'PowerShell / bash' }] },
  { slug: 'people-mobile',       label: 'Mobile',       category: 'People & UI', iconId: 'people-ui--mobile',       defaultName: 'Mobile',       fields: [] },
  { slug: 'people-laptop',       label: 'Laptop',       category: 'People & UI', iconId: 'people-ui--laptop',       defaultName: 'Laptop',       fields: [] },
  { slug: 'people-server',       label: 'Server',       category: 'People & UI', iconId: 'people-ui--server',       defaultName: 'Server',       fields: [{ key: 'os', label: 'OS', kind: 'text' }] },
  { slug: 'people-stick-figure', label: 'Person',       category: 'People & UI', iconId: 'people-ui--stick-figure', defaultName: 'Person',       fields: [{ key: 'role', label: 'Role', kind: 'text' }] },

  // ==== Custom (generic bucket for icons dropped from the "All icons" tab) ====
  { slug: 'custom', label: 'Custom', category: 'Custom', iconId: 'general--all-resources', defaultName: 'Resource', fields: [] },

  ...ONPREM_TYPES,

  // The one container in the Microsoft 365 set, so workloads can be drawn
  // inside a tenant boundary. Declared here rather than in M365_TYPES
  // because `isGroup` + `color` don't fit that table's tuple shape.
  { slug: 'm365-tenant', label: 'Microsoft 365 Tenant', category: 'Microsoft 365', iconId: 'microsoft-365--tenant', defaultName: 'contoso.onmicrosoft.com', fields: F_M365_ID, isGroup: true, color: '#2A446F' },
  ...M365_TYPES,
];

export const RESOURCE_TYPES_BY_SLUG: Record<string, ResourceType> = Object.fromEntries(
  RESOURCE_TYPES.map((r) => [r.slug, r])
);

/**
 * Reverse lookup: iconId → ResourceType. Populated once at module load.
 * First-match-wins for icons shared by multiple types (e.g. the Virtual
 * Network Gateways icon is used by both `vpn-gw` and `er-gw` — VPN GW
 * wins because it is declared first; the user can swap via the
 * PropertyPanel's Resource type dropdown).
 *
 * The generic fallback icon `general--all-resources` is intentionally
 * EXCLUDED — it is not a meaningful resource identifier, and mapping it
 * would defeat the fallback path for truly unmapped icons.
 */
const ICONS_EXCLUDED_FROM_REVERSE_LOOKUP = new Set<string>(['general--all-resources']);
export const RESOURCE_TYPE_BY_ICON: Record<string, ResourceType> = (() => {
  const map: Record<string, ResourceType> = {};
  for (const rt of RESOURCE_TYPES) {
    if (ICONS_EXCLUDED_FROM_REVERSE_LOOKUP.has(rt.iconId)) continue;
    if (map[rt.iconId]) continue; // first-match wins
    map[rt.iconId] = rt;
  }
  return map;
})();

/**
 * Given an icon manifest id, return the matching ResourceType if one
 * exists — used when a user drops an icon from the "All icons" tab so
 * the resulting node picks up the ResourceType's rich `fields[]` (e.g.
 * OS / Size / Private IP for a VM) instead of becoming a bare Custom
 * node. Returns `undefined` for icons that don't correspond to any
 * ResourceType (those still fall back to `custom`).
 */
export function getResourceTypeByIcon(iconId: string): ResourceType | undefined {
  return RESOURCE_TYPE_BY_ICON[iconId];
}

/** Fallback used when a diagram references an unknown resource type. */
export const UNKNOWN_TYPE: ResourceType = {
  slug: 'unknown',
  label: 'Unknown',
  category: 'External',
  iconId: 'general--all-resources',
  defaultName: 'Resource',
  fields: [],
};

export function getResourceType(slug: string): ResourceType {
  return RESOURCE_TYPES_BY_SLUG[slug] ?? UNKNOWN_TYPE;
}

/**
 * Render order for the Resources palette section, and for the "Resource
 * type" dropdowns in the Property Panel and on a container header.
 *
 * v0.9.80 — ordered by how far a reader has to scroll to reach something
 * they actually place, rather than by the order the sets were written.
 *
 * The section is one flowing list inside a ~550-px scroller, so position is
 * measured in pixels, not in list index. Under the old order the 77-tile
 * On-premises set sat fourth, which put Compute 2,308 px down, Security
 * 2,650 px down — four-plus screenfuls behind a wall of symbols that only
 * hybrid diagrams need. Azure's own building blocks now come first and the
 * two large specialist sets (On-premises 77, Microsoft 365 40) sit below
 * them: Compute lands at 804 px, Security at 962 px.
 *
 * Measured depths, 4 columns at ~66 px a row:
 *   before  External 0 · People&UI 92 · Group 250 · Networking 408 ·
 *           On-prem 962 · Compute 2308 · Storage 2466 · Database 2558 ·
 *           Security 2650 · M365 2742
 *   after   External 0 · Group 92 · Networking 250 · Compute 804 ·
 *           Security 962 · Database 1054 · Storage 1146 · People&UI 1238 ·
 *           On-prem 1396 · M365 2898
 *
 * There is no usage telemetry in this app, so this is a reasoned default
 * rather than a measured one. Favorites is the per-user correction.
 */
export const CATEGORIES_ORDER = [
  'External',
  'Group',
  'Networking',
  'Compute',
  'Security',
  'Database',
  'Storage',
  'People & UI',
  'On-premises',
  'Microsoft 365',
  'Custom',
];
