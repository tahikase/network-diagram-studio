// RESOURCE KNOWLEDGE BASE — per-resource beginner explanations rendered by the
// Property Panel to answer three questions about anything selected:
//
//   what  — What IS this resource?
//   why   — Why is it needed / what problem does it solve?
//   how   — How is it typically used in a topology like this one?
//   checks— If this hop is where traffic breaks, what do you look at first?
//   docs  — One authoritative learn.microsoft.com link.
//
// IMPORTANT: the keys here MUST be real slugs from `src/model/resource-types.ts`.
// The previous ROLE_HINTS map silently used invented slugs ('dns', 'nat-gw',
// 'apim', 'waf', 'private-dns', 'route'), so those resources produced NO
// explanation at all. Keep this file in sync when adding a resource type.

export interface ResourceKnowledge {
  /** Expanded display name, used when the palette label is an abbreviation. */
  fullName?: string;
  what: string;
  why: string;
  how: string;
  /** Concrete first-look items when this hop is the suspected failure point. */
  checks?: string[];
  docs?: string;
}

export const RESOURCE_KNOWLEDGE: Record<string, ResourceKnowledge> = {
  // ---------------------------------------------------------------- Groups
  'group-region': {
    fullName: 'Azure region',
    what: 'An Azure region is a set of datacenters in one geography that hosts your resources.',
    why: 'Region choice controls latency to your users, data-residency compliance, and which services and SKUs are even available.',
    how: 'Everything drawn inside this boundary is deployed in the same region, so traffic between those resources stays on the regional network rather than crossing the internet.',
    checks: [
      'Confirm both sides of the flow are in the region you expect — cross-region hops add latency and egress charges.',
      'Check the service is actually available in this region (some SKUs are region-limited).',
    ],
    docs: 'https://learn.microsoft.com/azure/reliability/availability-zones-overview',
  },
  'group-subscription': {
    fullName: 'Azure subscription',
    what: 'A subscription is the billing and quota boundary that resources are created in.',
    why: 'It separates billing, applies quota limits, and acts as a scope for role assignments and policy.',
    how: 'Resources in different subscriptions can still be peered and connected, but quota, policy, and RBAC are evaluated per subscription.',
    checks: [
      'Verify you have not hit a subscription-level quota (public IPs, VNet peerings, gateway count).',
      'Cross-subscription peering and Private Link need permissions in BOTH subscriptions.',
    ],
    docs: 'https://learn.microsoft.com/azure/cloud-adoption-framework/ready/azure-best-practices/organize-subscriptions',
  },
  'group-rg': {
    fullName: 'Resource group',
    what: 'A resource group is a logical container that holds related Azure resources.',
    why: 'It groups resources with a shared lifecycle so they can be deployed, permissioned, and deleted together.',
    how: 'A resource group is a management construct only — it does not affect network reachability. Two resources in different resource groups talk to each other normally.',
    checks: [
      'Resource group membership never blocks traffic — if something is unreachable, look at NSG, UDR, DNS, or peering instead.',
      'Check for a delete lock or Azure Policy assignment at this scope if a deployment is failing.',
    ],
    docs: 'https://learn.microsoft.com/azure/azure-resource-manager/management/manage-resource-groups-portal',
  },
  'group-onprem': {
    fullName: 'On-premises network',
    what: 'This represents the customer network outside Azure — a corporate datacenter, branch office, or another cloud.',
    why: 'Most enterprise workloads are hybrid, so Azure resources must reach systems that still live on-premises (and vice versa).',
    how: 'It connects to Azure through a Site-to-Site VPN tunnel or an ExpressRoute circuit. Routes are exchanged either statically or via BGP.',
    checks: [
      'Confirm the on-premises firewall permits the required ports in BOTH directions.',
      'Check that the on-premises router actually advertises the local prefixes, and that it learns the Azure address space.',
      'Watch for overlapping address space between on-premises and the Azure VNet — that breaks routing.',
    ],
    docs: 'https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-about-vpngateways',
  },
  'group-vnet': {
    fullName: 'Virtual Network (VNet)',
    what: 'A Virtual Network is your private, isolated network in Azure, defined by one or more address ranges (CIDR blocks).',
    why: 'It gives your resources private IP addresses and a security boundary, so they can talk to each other privately instead of over the public internet.',
    how: 'Resources are placed in subnets inside the VNet. Everything in the same VNet can reach everything else by default; reaching another VNet requires peering, a gateway, or Private Link.',
    checks: [
      'Verify the VNet address space does not overlap with any peered VNet or the on-premises network.',
      'Check effective routes on a NIC in this VNet to see what next hop Azure is actually using.',
      'Confirm the VNet DNS setting (Azure-provided vs custom DNS servers) matches what the workload expects.',
    ],
    docs: 'https://learn.microsoft.com/azure/virtual-network/virtual-networks-overview',
  },
  'group-subnet': {
    what: 'A subnet is a slice of the VNet address space where resources actually get their IP addresses.',
    why: 'Subnets let you segment a VNet so different tiers (web, app, data) can be secured and routed independently.',
    how: 'An NSG and a route table are attached at the subnet level, so every resource in the subnet inherits those rules. Some services require a dedicated, specially-named subnet (for example GatewaySubnet, AzureFirewallSubnet, AzureBastionSubnet).',
    checks: [
      'Check the NSG attached to this subnet — subnet rules are evaluated before NIC rules for inbound traffic.',
      'Check the route table attached to this subnet for a UDR that overrides the default system route.',
      'Confirm the subnet is large enough — Azure reserves 5 addresses in every subnet.',
      'Gateway, Firewall, and Bastion subnets must use their exact reserved names or deployment fails.',
    ],
    docs: 'https://learn.microsoft.com/azure/virtual-network/virtual-network-manage-subnet',
  },

  // -------------------------------------------------------------- External
  user: {
    what: 'The end user or client device that starts the request.',
    why: 'Every traffic flow needs an origin — this is the person or application whose experience you are troubleshooting.',
    how: 'The client resolves a name through DNS, then connects to whatever public or private IP that name returns.',
    checks: [
      'Confirm what the client actually resolves the name to — a wrong DNS answer sends traffic to the wrong place.',
      'Check whether the client is on the corporate network, on VPN, or on the public internet, because the path differs.',
    ],
  },
  internet: {
    what: 'The public internet — traffic arriving from, or leaving to, addresses outside your network.',
    why: 'Public-facing workloads must be reachable from the internet, and most workloads need outbound internet access for updates and API calls.',
    how: 'Inbound internet traffic lands on a public IP attached to a gateway, load balancer, or VM. Outbound traffic leaves through a NAT Gateway, a load balancer, or a firewall.',
    checks: [
      'For inbound: confirm the public IP, the NSG allow rule, and the health of the backend.',
      'For outbound: confirm an explicit method exists — a NAT Gateway, a load balancer outbound rule, or a public IP on the NIC. Default outbound access was retired on 30 September 2025, so a new VM without one of these has no internet access at all.',
    ],
    docs: 'https://learn.microsoft.com/azure/virtual-network/ip-services/default-outbound-access',
  },

  // ------------------------------------------------------------ Networking
  appgw: {
    fullName: 'Application Gateway',
    what: 'Application Gateway is a regional Layer-7 (HTTP/HTTPS) load balancer.',
    why: 'It routes by URL path and hostname, terminates TLS so certificates live in one place, and can run a Web Application Firewall in front of your app.',
    how: 'A listener accepts the request on the front-end IP, a rule matches it, and the request is forwarded to a backend pool member that the health probe reports as healthy.',
    checks: [
      'Check backend health first — an unhealthy pool returns 502.',
      'Confirm the NSG on the Application Gateway subnet allows the required inbound ports from the GatewayManager service tag.',
      'For TLS errors, check certificate expiry, chain, and whether the backend hostname matches the certificate.',
    ],
    docs: 'https://learn.microsoft.com/azure/application-gateway/overview',
  },
  'appgw-containers': {
    fullName: 'Application Gateway for Containers',
    what: 'Application Gateway for Containers is the Kubernetes-native Layer-7 ingress built on the Application Gateway platform.',
    why: 'It lets AKS workloads use Gateway API and Ingress objects to publish services without hand-managing gateway configuration.',
    how: 'The ALB controller in the cluster watches Kubernetes objects and programs the gateway, forwarding HTTP/HTTPS traffic straight to pod endpoints.',
    checks: [
      'Check the ALB controller pod logs in the cluster.',
      'Confirm the association subnet is delegated correctly and has free addresses.',
    ],
    docs: 'https://learn.microsoft.com/azure/application-gateway/for-containers/overview',
  },
  lb: {
    fullName: 'Azure Load Balancer',
    what: 'Azure Load Balancer is a Layer-4 (TCP/UDP) load balancer that spreads connections across a backend pool.',
    why: 'It provides high availability and scale — if one backend instance fails its health probe, new connections stop going to it.',
    how: 'A load-balancing rule maps a front-end IP and port to a backend pool and port. It does not inspect or modify the payload, so it cannot route by URL.',
    checks: [
      'Check health probe status — if every instance is unhealthy the load balancer silently drops traffic.',
      'Confirm the NSG on the backend NICs or subnet allows the probe source (AzureLoadBalancer service tag) and the data port.',
      'For an internal load balancer, confirm the client is on a network that can reach the private front-end IP.',
    ],
    docs: 'https://learn.microsoft.com/azure/load-balancer/load-balancer-overview',
  },
  'front-door': {
    fullName: 'Azure Front Door',
    what: 'Front Door is a global Layer-7 entry point with content delivery and WAF built in.',
    why: 'It terminates the user connection at the nearest Microsoft edge site, which cuts latency, and it fails over between regional backends automatically.',
    how: 'The user resolves your hostname to the closest edge POP. The edge applies WAF and caching rules, then forwards over the Microsoft backbone to the healthiest origin.',
    checks: [
      'Check origin health probes and the origin host header setting — a mismatch causes 4xx from the origin.',
      'Confirm the origin only accepts traffic from Front Door (X-Azure-FDID header or the AzureFrontDoor.Backend service tag).',
      'Caching can mask a backend change — purge before concluding the backend is wrong.',
    ],
    docs: 'https://learn.microsoft.com/azure/frontdoor/front-door-overview',
  },
  'traffic-manager': {
    fullName: 'Traffic Manager',
    what: 'Traffic Manager is DNS-based global load balancing — it answers DNS queries with the endpoint you should use.',
    why: 'It steers users to the closest or highest-priority region and removes failed regions from DNS answers.',
    how: 'It never sees your traffic. It only returns a CNAME or IP in a DNS answer, so the client connects directly to the chosen endpoint afterwards.',
    checks: [
      'Because it is DNS-based, client-side DNS caching and TTL delay failover — check the TTL.',
      'Check endpoint monitor status; an endpoint marked Degraded is removed from responses.',
    ],
    docs: 'https://learn.microsoft.com/azure/traffic-manager/traffic-manager-overview',
  },
  'vpn-gw': {
    fullName: 'VPN Gateway',
    what: 'A VPN Gateway terminates encrypted IPsec/IKE tunnels between Azure and an on-premises device or remote user.',
    why: 'It gives you private connectivity into the VNet over the public internet, without exposing resources publicly.',
    how: 'It lives in the reserved GatewaySubnet and pairs with a Local Network Gateway (the remote device) through a Connection resource. Routes are static or learned via BGP.',
    checks: [
      'Confirm the tunnel is Connected, not just Provisioned.',
      'IKE phase 1/2 settings, PSK, and the IPsec policy must match EXACTLY on both ends.',
      'Check that the on-premises prefixes are present in the Local Network Gateway (or advertised via BGP).',
      'Verify the SKU supports the tunnel count and throughput you need.',
    ],
    docs: 'https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-about-vpngateways',
  },
  'er-gw': {
    fullName: 'ExpressRoute Gateway',
    what: 'An ExpressRoute Gateway is the VNet-side endpoint that attaches a VNet to an ExpressRoute circuit.',
    why: 'It injects the routes learned from on-premises into the VNet and forwards traffic onto the private circuit.',
    how: 'It sits in the GatewaySubnet and is linked to a circuit through a connection. Route exchange is always via BGP.',
    checks: [
      'Check the number of routes learned — exceeding the route limit drops the BGP session.',
      'Confirm the gateway SKU supports the required throughput and the number of circuit connections.',
      'Use effective routes on a workload NIC to prove the on-premises prefixes really arrived.',
    ],
    docs: 'https://learn.microsoft.com/azure/expressroute/expressroute-about-virtual-network-gateways',
  },
  'er-circuit': {
    fullName: 'ExpressRoute circuit',
    what: 'An ExpressRoute circuit is a private Layer-3 connection between your network and Microsoft, provided by a connectivity partner.',
    why: 'It avoids the public internet entirely, giving predictable latency, higher bandwidth, and an SLA.',
    how: 'The circuit carries one or more peerings. Private peering reaches your VNets; Microsoft peering reaches Microsoft public services such as Microsoft 365.',
    checks: [
      'Confirm the circuit status is Provisioned and the peering is configured on both the provider and Microsoft side.',
      'Check BGP session state and the advertised/received route counts on each peering.',
      'Circuits are redundant by design — verify BOTH links, not just the primary.',
    ],
    docs: 'https://learn.microsoft.com/azure/expressroute/expressroute-circuit-peerings',
  },
  'local-gw': {
    fullName: 'Local Network Gateway',
    what: 'A Local Network Gateway is the Azure object that describes your on-premises VPN device — its public IP and the prefixes behind it.',
    why: 'Azure needs to know which address ranges live on the far side of the tunnel so it can route to them.',
    how: 'It is referenced by a Connection resource, which pairs it with the Azure VPN Gateway. With BGP, the prefix list is learned dynamically instead.',
    checks: [
      'A missing or wrong prefix here is the single most common cause of "the tunnel is up but traffic does not pass".',
      'Confirm the public IP matches the on-premises device address seen from the internet after NAT.',
    ],
    docs: 'https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-about-vpn-gateway-settings',
  },
  connection: {
    fullName: 'Connection',
    what: 'A Connection is the resource that pairs an Azure gateway with the remote side — a Local Network Gateway, another VNet gateway, or an ExpressRoute circuit.',
    why: 'The gateway alone does nothing; the connection is what actually establishes and holds the tunnel or circuit link.',
    how: 'It carries the shared key, the IPsec/IKE policy, and the BGP setting for that specific link.',
    checks: [
      'Check connection status and the ingress/egress byte counters — zero bytes with a Connected state points at routing, not the tunnel.',
      'Compare the IPsec policy on this connection with the on-premises configuration line by line.',
    ],
    docs: 'https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-about-vpn-gateway-settings',
  },
  firewall: {
    fullName: 'Azure Firewall',
    what: 'Azure Firewall is a managed, stateful network firewall that inspects traffic against DNAT, network, and application rules.',
    why: 'It centralises egress control and logging, so one policy governs what an entire hub-and-spoke estate is allowed to reach.',
    how: 'Traffic is steered to it with a User-Defined Route pointing at its private IP. Rules are evaluated in order: DNAT, then network rules, then application rules.',
    checks: [
      'Check the firewall logs for the specific flow — they tell you which rule allowed or denied it.',
      'Confirm a UDR actually forces the traffic through the firewall; without it traffic bypasses the firewall entirely.',
      'Asymmetric routing is a classic failure — the return path must also traverse the firewall.',
      'Application rules need the FQDN; if the client resolves DNS differently, the rule will not match.',
    ],
    docs: 'https://learn.microsoft.com/azure/firewall/overview',
  },
  'firewall-policy': {
    fullName: 'Firewall Policy',
    what: 'Firewall Policy is the reusable rule container that one or more Azure Firewalls apply.',
    why: 'It lets you write rules once and inherit them across firewalls, with a parent policy for organisation-wide rules and child policies per environment.',
    how: 'Rule collection groups are evaluated by priority, and inherited parent rules always run before child rules.',
    checks: [
      'Check priority ordering — a broad deny in a parent policy silently overrides a child allow.',
      'Confirm the policy is actually associated with the firewall handling this traffic.',
    ],
    docs: 'https://learn.microsoft.com/azure/firewall-manager/policy-overview',
  },
  'waf-policy': {
    fullName: 'Web Application Firewall (WAF) policy',
    what: 'A WAF policy is the rule set that inspects HTTP requests for common web attacks such as SQL injection and cross-site scripting.',
    why: 'It blocks application-layer attacks that a Layer-4 firewall or NSG cannot see, because those only look at IP and port.',
    how: 'It attaches to Application Gateway or Front Door and runs in Detection mode (log only) or Prevention mode (block).',
    checks: [
      'A legitimate request being blocked shows up as a 403 — check the WAF logs for the triggering rule ID and add an exclusion.',
      'Confirm whether the policy is in Detection or Prevention mode before concluding it is not the cause.',
    ],
    docs: 'https://learn.microsoft.com/azure/web-application-firewall/ag/ag-overview',
  },
  nsg: {
    fullName: 'Network Security Group (NSG)',
    what: 'An NSG is a stateful packet filter with allow and deny rules based on source, destination, port, and protocol.',
    why: 'It is the basic segmentation control in Azure, but it does not deny by default: the built-in AllowVNetInBound rule already permits all traffic inside the virtual network, so segmentation starts only when you add your own higher-priority deny.',
    how: 'It attaches to a subnet, a NIC, or both. Rules are evaluated by priority, lowest number first, and the first match wins. Because it is stateful, return traffic for an allowed flow is permitted automatically.',
    checks: [
      'Use Effective security rules on the NIC — that shows the merged subnet + NIC result, which is what actually applies.',
      'Remember inbound is evaluated subnet-first then NIC; outbound is NIC-first then subnet.',
      'Check the default rules — DenyAllInbound at priority 65500 catches anything you did not explicitly allow.',
      'Service tags change over time; prefer them over hard-coded IP ranges.',
    ],
    docs: 'https://learn.microsoft.com/azure/virtual-network/network-security-groups-overview',
  },
  udr: {
    fullName: 'Route table / User-Defined Route (UDR)',
    what: 'A route table holds User-Defined Routes that override the routes Azure creates by default.',
    why: 'You need it whenever traffic must take a path Azure would not choose on its own — for example forcing all egress through a firewall or NVA.',
    how: 'It attaches to a subnet. Azure picks the most specific matching prefix; if two routes tie, a UDR beats a BGP route, which beats a system route.',
    checks: [
      'Check effective routes on the NIC — that is the ground truth, not the route table definition.',
      'A 0.0.0.0/0 route with next hop None or a stale appliance IP blackholes all outbound traffic.',
      'Make sure the return path has an equivalent route, or the flow becomes asymmetric and is dropped by the stateful firewall.',
    ],
    docs: 'https://learn.microsoft.com/azure/virtual-network/virtual-networks-udr-overview',
  },
  nic: {
    fullName: 'Network interface (NIC)',
    what: 'A NIC is the virtual network adapter that attaches a VM to a subnet and holds its private IP.',
    why: 'It is where a VM gets its IP configuration, and it is the most precise place to attach an NSG or check what rules and routes actually apply.',
    how: 'One VM can have multiple NICs, and each NIC can hold multiple IP configurations. Accelerated Networking is enabled per NIC.',
    checks: [
      'Effective routes and effective security rules are both read from the NIC — always start here.',
      'Confirm IP forwarding is enabled if this NIC belongs to an NVA that must route traffic for others.',
    ],
    docs: 'https://learn.microsoft.com/azure/virtual-network/virtual-network-network-interface',
  },
  pip: {
    fullName: 'Public IP address',
    what: 'A Public IP is an internet-routable address assigned to a gateway, load balancer, firewall, or VM NIC.',
    why: 'It is what makes a resource reachable from the internet, and it identifies your traffic when it leaves Azure.',
    how: 'Standard SKU addresses are static and secure-by-default — inbound is denied unless an NSG allows it. Basic SKU is retired.',
    checks: [
      'Confirm the address is actually associated with the resource you think it is.',
      'For Standard SKU, remember inbound is closed by default until an NSG rule opens it.',
      'Zone-redundant vs zonal matters for availability during a zone outage.',
    ],
    docs: 'https://learn.microsoft.com/azure/virtual-network/ip-services/public-ip-addresses',
  },
  'pip-prefix': {
    fullName: 'Public IP prefix',
    what: 'A Public IP Prefix is a contiguous block of public addresses reserved for your subscription.',
    why: 'It gives you a predictable, unchanging range so partners and firewalls can allow-list your egress addresses once.',
    how: 'Individual public IPs are then allocated from the prefix and assigned to resources such as a NAT Gateway or load balancer.',
    checks: [
      'Verify the downstream party has allow-listed the whole prefix, not one address from it.',
    ],
    docs: 'https://learn.microsoft.com/azure/virtual-network/ip-services/public-ip-address-prefix',
  },
  nat: {
    fullName: 'NAT Gateway',
    what: 'NAT Gateway provides outbound-only internet connectivity for a subnet, using dedicated public IPs.',
    why: 'It gives you a stable, known egress address and a very large pool of SNAT ports, which prevents the port-exhaustion failures common with default outbound access.',
    how: 'It attaches to one or more subnets. Once attached, it takes priority over all other outbound methods for those subnets. It never allows unsolicited inbound traffic.',
    checks: [
      'Check SNAT port utilisation metrics if outbound connections start failing intermittently.',
      'NAT Gateway is zonal — confirm the zone matches the workload for zone-resilient designs.',
      'It cannot be used for inbound; if inbound is needed, that is a separate load balancer or public IP.',
    ],
    docs: 'https://learn.microsoft.com/azure/nat-gateway/nat-overview',
  },
  'private-endpoint': {
    fullName: 'Private Endpoint',
    what: 'A Private Endpoint is a NIC in your subnet that holds a private IP mapped to a specific PaaS resource.',
    why: 'It lets you reach a PaaS service such as Storage or SQL over a private IP on the Microsoft backbone, so the public endpoint can be disabled entirely.',
    how: 'It only works if DNS resolves the service hostname to the private IP. That is normally done with a Private DNS Zone linked to the VNet.',
    checks: [
      'DNS is the number-one cause of failure — run a lookup from the client and confirm it returns the private IP, not the public one.',
      'Confirm the Private DNS Zone is linked to the VNet the client sits in, and that the A record exists.',
      'Check the connection state is Approved, not Pending.',
      'NSGs and UDRs affect a Private Endpoint only when the subnet has PrivateEndpointNetworkPolicies enabled — it is disabled by default, so a rule you expect to match may never be evaluated at all.',
    ],
    docs: 'https://learn.microsoft.com/azure/private-link/private-endpoint-overview',
  },
  'private-link-service': {
    fullName: 'Private Link Service',
    what: 'Private Link Service publishes your own service, sitting behind a Standard internal load balancer, so other VNets can consume it via a Private Endpoint.',
    why: 'It lets you offer a service to customers or other business units without peering networks or exposing anything publicly.',
    how: 'Consumers create a Private Endpoint that requests a connection; you approve it. Traffic arrives with the source NAT applied by the platform.',
    checks: [
      'Confirm the consumer connection request has been approved.',
      'The NAT subnet must have enough free IP addresses for the number of connections.',
      'The backend must be behind a Standard SKU internal load balancer — Basic is not supported.',
    ],
    docs: 'https://learn.microsoft.com/azure/private-link/private-link-service-overview',
  },
  vwan: {
    fullName: 'Virtual WAN',
    what: 'Virtual WAN is a managed networking service that provides a global transit hub-and-spoke backbone.',
    why: 'It removes the work of building and maintaining your own hubs, route tables, and gateway meshes across many regions and branches.',
    how: 'You create hubs per region and connect VNets, branches (VPN), and ExpressRoute circuits to them. Microsoft handles the any-to-any routing between hubs.',
    checks: [
      'Check the effective routes on the hub route table, not just on the spoke.',
      'Confirm the VNet connection propagates to, and associates with, the route tables you expect.',
    ],
    docs: 'https://learn.microsoft.com/azure/virtual-wan/virtual-wan-about',
  },
  'vwan-hub': {
    fullName: 'Virtual WAN hub',
    what: 'A Virtual WAN hub is the Microsoft-managed regional hub VNet that spokes and branches connect into.',
    why: 'It provides transit routing between everything attached to it, without you having to build gateway chaining or route tables by hand.',
    how: 'VNet connections, VPN sites, and ExpressRoute circuits attach to the hub, and hub route tables control who can reach whom.',
    checks: [
      'Check hub routing status and the effective routes for the connection in question.',
      'Secured hub (Routing Intent) changes the path — confirm whether traffic is being sent to Azure Firewall.',
    ],
    docs: 'https://learn.microsoft.com/azure/virtual-wan/virtual-wan-about',
  },
  'dns-zone': {
    fullName: 'DNS zone',
    what: 'A DNS zone holds the records that translate names into IP addresses. A Private DNS Zone is only visible to VNets that are linked to it.',
    why: 'Nothing reaches the right destination if the name resolves to the wrong address — DNS is the first hop of almost every flow.',
    how: 'A Private DNS Zone is linked to one or more VNets. With auto-registration enabled, VMs in a linked VNet register their own records.',
    checks: [
      'Confirm a virtual network link exists between the zone and the client VNet — without it the zone is invisible.',
      'Check the A record exists and points at the expected IP.',
      'For Private Endpoints, the zone name must match the required pattern exactly (for example privatelink.blob.core.windows.net).',
      'Client-side caching can hide a fix — flush the resolver cache before retesting.',
    ],
    docs: 'https://learn.microsoft.com/azure/dns/private-dns-overview',
  },
  'dns-resolver': {
    fullName: 'DNS Private Resolver',
    what: 'DNS Private Resolver is a managed service that resolves DNS between on-premises and Azure without you running DNS server VMs.',
    why: 'On-premises clients cannot query Azure Private DNS Zones directly, and Azure clients often need to resolve on-premises names. The resolver bridges both directions.',
    how: 'An INBOUND endpoint gives on-premises an IP in Azure to forward queries to. An OUTBOUND endpoint plus a forwarding ruleset sends Azure queries for specific domains to on-premises DNS servers.',
    checks: [
      'Confirm the on-premises conditional forwarder points at the inbound endpoint IP, and that UDP and TCP port 53 are open across the tunnel.',
      'Check the forwarding ruleset is linked to the VNet, and that the rule domain name ends with a trailing dot.',
      'Inbound and outbound endpoints each need their own delegated subnet.',
      'Verify the target on-premises DNS server actually answers queries from the Azure source range.',
    ],
    docs: 'https://learn.microsoft.com/azure/dns/dns-private-resolver-overview',
  },
  bastion: {
    fullName: 'Azure Bastion',
    what: 'Azure Bastion is a managed jump host that gives browser-based RDP and SSH access to VMs.',
    why: 'It removes the need to give VMs public IPs or open 3389/22 to the internet, which is one of the most exploited misconfigurations.',
    how: 'It is deployed into a dedicated AzureBastionSubnet. The admin connects to the Azure portal over TLS, and Bastion opens the RDP or SSH session to the VM private IP.',
    checks: [
      'The subnet must be named exactly AzureBastionSubnet and be /26 or larger.',
      'The target VM NSG must allow inbound 3389/22 FROM the Bastion subnet.',
      'Native client and IP-based connection require the Standard or Premium SKU.',
    ],
    docs: 'https://learn.microsoft.com/azure/bastion/bastion-overview',
  },
  'network-watcher': {
    fullName: 'Network Watcher',
    what: 'Network Watcher is the diagnostics toolbox for Azure networking — connection troubleshoot, IP flow verify, next hop, packet capture, and flow logs.',
    why: 'It answers "is this being blocked, and by what?" with data instead of guesswork.',
    how: 'It is enabled per region. IP flow verify names the exact NSG rule that allowed or denied a flow; next hop shows where a packet would actually be routed.',
    checks: [
      'Run IP flow verify for the failing 5-tuple — it names the deciding rule directly.',
      'Run next hop from the source NIC to confirm the routing decision.',
      'Enable VNet flow logs for a historical record of allow and deny decisions.',
    ],
    docs: 'https://learn.microsoft.com/azure/network-watcher/network-watcher-overview',
  },
  'ddos-plan': {
    fullName: 'DDoS Protection plan',
    what: 'A DDoS Protection plan adds always-on traffic monitoring and adaptive mitigation for public IPs in protected VNets.',
    why: 'Azure protects its platform by default, but a Network Protection plan tunes mitigation to YOUR traffic and adds attack telemetry plus cost protection.',
    how: 'The plan is associated with a VNet, and every public IP in that VNet is then protected.',
    checks: [
      'Check DDoS mitigation metrics before assuming an outage is application-side.',
      'Confirm the VNet is actually associated with the plan.',
    ],
    docs: 'https://learn.microsoft.com/azure/ddos-protection/ddos-protection-overview',
  },
  'ip-group': {
    fullName: 'IP Group',
    what: 'An IP Group is a named, reusable collection of IP addresses and ranges.',
    why: 'It keeps firewall rules readable and lets you update one object instead of editing many rules.',
    how: 'Azure Firewall rules reference the IP Group by name in the source or destination field.',
    checks: [
      'Confirm the address you expect is really in the group — a missing entry looks exactly like a firewall deny.',
    ],
    docs: 'https://learn.microsoft.com/azure/firewall/ip-groups',
  },
  nva: {
    fullName: 'Network Virtual Appliance (NVA)',
    what: 'An NVA is a third-party firewall, router, or proxy running as a VM inside your VNet.',
    why: 'Customers use one when they need a specific vendor feature set, or want the same appliance on-premises and in Azure.',
    how: 'Traffic is steered to it with a UDR. For high availability it sits behind an internal load balancer, and its NIC must have IP forwarding enabled.',
    checks: [
      'IP forwarding must be enabled on the NVA NIC in Azure AND inside the guest OS.',
      'Check for asymmetric routing — both directions must traverse the same appliance instance.',
      'Confirm the UDR next hop points at the NVA private IP (or the internal load balancer front end for an HA pair).',
    ],
    docs: 'https://learn.microsoft.com/azure/architecture/networking/guide/nva-ha',
  },

  // --------------------------------------------------------------- Compute
  vm: {
    fullName: 'Virtual Machine',
    what: 'A Virtual Machine is a server you run in Azure, with its own operating system and applications.',
    why: 'It is the destination doing the actual work — serving the page, running the query, hosting the application.',
    how: 'It connects to a subnet through a NIC. Its reachability is governed by the NSG on that NIC and on the subnet, plus the guest OS firewall.',
    checks: [
      'The guest OS firewall is a separate layer from the NSG — Windows Firewall or iptables can block traffic the NSG allowed.',
      'Confirm the application is actually listening on the expected port (netstat or ss).',
      'Check effective routes and effective security rules on the NIC.',
    ],
    docs: 'https://learn.microsoft.com/azure/virtual-machines/overview',
  },
  vmss: {
    fullName: 'Virtual Machine Scale Set',
    what: 'A Scale Set manages an identical group of VMs that grows and shrinks automatically.',
    why: 'It handles scale and instance repair for you, so capacity follows demand without manual VM creation.',
    how: 'Instances share one network configuration and normally sit in a load balancer or Application Gateway backend pool.',
    checks: [
      'Check whether unhealthy instances are being rolled — an instance can be up but failing its probe.',
      'Confirm the upgrade policy is not mid-rollout when investigating inconsistent behaviour.',
    ],
    docs: 'https://learn.microsoft.com/azure/virtual-machine-scale-sets/overview',
  },
  aks: {
    fullName: 'Azure Kubernetes Service (AKS)',
    what: 'AKS is managed Kubernetes — Azure runs the control plane and you run workloads in node pools.',
    why: 'It gives container workloads scheduling, self-healing, and scaling without you operating Kubernetes masters.',
    how: 'Azure CNI is the current plugin and the IP mode is what matters. In node-subnet or pod-subnet mode every pod gets a real VNet IP, so pod addresses must be planned into the subnet size; CNI Overlay instead puts pods on a separate overlay range and consumes far fewer VNet IPs. Legacy kubenet is retiring on 31 March 2028.',
    checks: [
      'Confirm the subnet has enough free addresses for the maximum pods per node under Azure CNI.',
      'Check the service type — ClusterIP is cluster-internal only, LoadBalancer creates an Azure load balancer.',
      'Outbound type (load balancer, NAT Gateway, or userDefinedRouting) determines the egress path.',
    ],
    docs: 'https://learn.microsoft.com/azure/aks/intro-kubernetes',
  },
  'container-instance': {
    fullName: 'Container Instance',
    what: 'Container Instances runs a single container without any cluster to manage.',
    why: 'It suits short-lived or bursty jobs where a full Kubernetes cluster would be overkill.',
    how: 'It can be deployed into a VNet subnet for private access, or given a public IP for direct access.',
    checks: [
      'VNet-deployed container groups need a delegated subnet.',
      'Check container logs and restart count first — an app crash looks like a network failure from outside.',
    ],
    docs: 'https://learn.microsoft.com/azure/container-instances/container-instances-overview',
  },
  'container-registry': {
    fullName: 'Container Registry',
    what: 'Azure Container Registry stores and serves your container images.',
    why: 'Compute platforms need somewhere private and close to pull images from at deployment time.',
    how: 'It can be reached publicly, or privately through a Private Endpoint with the matching Private DNS Zone.',
    checks: [
      'An image pull failure over Private Link is nearly always DNS — verify the registry name resolves to the private IP.',
      'Confirm the pulling identity has the AcrPull role.',
    ],
    docs: 'https://learn.microsoft.com/azure/container-registry/container-registry-intro',
  },
  'app-service': {
    fullName: 'App Service',
    what: 'App Service is a managed platform for hosting web apps and APIs without managing servers.',
    why: 'It removes OS patching and scaling work, so teams ship application code instead of infrastructure.',
    how: 'Inbound private access uses a Private Endpoint. Outbound access into a VNet uses regional VNet integration — the two are separate features.',
    checks: [
      'Inbound and outbound are configured independently — confirm which direction is failing.',
      'For outbound VNet integration, WEBSITE_DNS_SERVER and route-all settings decide whether traffic uses VNet DNS and routes.',
      'Check whether Access Restrictions are blocking the caller.',
    ],
    docs: 'https://learn.microsoft.com/azure/app-service/overview',
  },
  'function-app': {
    fullName: 'Function App',
    what: 'A Function App runs small pieces of event-driven code, billed by execution.',
    why: 'It suits glue logic and triggers where running a full application host would be wasteful.',
    how: 'It shares the App Service networking model — Private Endpoint for inbound, VNet integration for outbound. The hosting plan decides what is available: Flex Consumption and Premium both support VNet integration, the classic Consumption plan does not.',
    checks: [
      'Confirm the hosting plan supports the networking feature you need — the classic Consumption plan has no VNet integration, while Flex Consumption and Premium do.',
      'The function needs reachable storage; a blocked storage account stops the function starting at all.',
    ],
    docs: 'https://learn.microsoft.com/azure/azure-functions/functions-overview',
  },
  'api-management': {
    fullName: 'API Management (APIM)',
    what: 'API Management is a gateway that publishes, secures, and throttles APIs.',
    why: 'It gives one consistent front door for many backends, with authentication, rate limiting, and transformation applied by policy.',
    how: 'It can be external (public front end) or internal (VNet-only). In VNet mode it has strict required NSG rules and dependency endpoints.',
    checks: [
      'VNet-injected APIM requires specific inbound NSG rules; missing them makes the service unhealthy.',
      'Check the policy trace for the failing call — the answer is usually a policy, not the network.',
      'Confirm backend certificate validation settings if the backend uses a private CA.',
    ],
    docs: 'https://learn.microsoft.com/azure/api-management/api-management-key-concepts',
  },

  // --------------------------------------------------------- Storage / data
  storage: {
    fullName: 'Storage Account',
    what: 'A Storage Account holds blobs, files, queues, and tables behind a public hostname per service.',
    why: 'It is the general-purpose durable store that most workloads read from and write to.',
    how: 'Access can be restricted with the firewall and virtual network rules, or made fully private with a Private Endpoint per sub-resource (blob, file, and so on).',
    checks: [
      'Each sub-resource needs its OWN Private Endpoint and its own privatelink DNS zone.',
      'If the account firewall is set to selected networks, confirm the caller subnet or IP is listed.',
      'A 403 usually means authorisation or firewall; a name-resolution failure means DNS.',
    ],
    docs: 'https://learn.microsoft.com/azure/storage/common/storage-account-overview',
  },
  'sql-db': {
    fullName: 'Azure SQL Database',
    what: 'Azure SQL Database is a managed relational database service.',
    why: 'It provides a SQL Server-compatible database without you patching, backing up, or clustering servers.',
    how: 'It is reached over TCP 1433. The connection policy is Redirect (which also needs ports 11000-11999) or Proxy (1433 only).',
    checks: [
      'Redirect policy requires 11000-11999 outbound to be open — this is a very common firewall oversight.',
      'Confirm the server firewall rules or Private Endpoint permit the client.',
      'Over Private Link, verify the name resolves to the private IP.',
    ],
    docs: 'https://learn.microsoft.com/azure/azure-sql/database/sql-database-paas-overview',
  },
  cosmos: {
    fullName: 'Cosmos DB',
    what: 'Cosmos DB is a globally distributed NoSQL database with low-latency reads and writes.',
    why: 'It suits workloads that need multi-region replication and predictable latency at scale.',
    how: 'The SDK can use direct mode, which opens additional TCP ports beyond 443, or gateway mode which uses 443 only.',
    checks: [
      'Direct mode needs TCP 10250-10255 and 10000-20000 open; gateway mode only needs 443.',
      'Private Endpoint requires a DNS record for every region the account is replicated to.',
    ],
    docs: 'https://learn.microsoft.com/azure/cosmos-db/introduction',
  },

  // ------------------------------------------------------------- Security
  'key-vault': {
    fullName: 'Key Vault',
    what: 'Key Vault stores secrets, keys, and certificates with access controlled by policy or RBAC.',
    why: 'It keeps credentials out of code and configuration, and gives you an audit trail of who read what.',
    how: 'It is reached over HTTPS. It can be locked down with firewall rules or a Private Endpoint, and callers usually authenticate with a managed identity.',
    checks: [
      'A 403 is authorisation (RBAC or access policy); a connection timeout is network.',
      'If the firewall is restricted, confirm the caller network or the trusted-services exception is allowed.',
      'Over Private Link, confirm the privatelink.vaultcore.azure.net zone is linked to the VNet.',
    ],
    docs: 'https://learn.microsoft.com/azure/key-vault/general/overview',
  },
  asg: {
    fullName: 'Application Security Group (ASG)',
    what: 'An ASG is a label you attach to NICs so NSG rules can target a workload role instead of IP addresses.',
    why: 'It keeps rules meaningful as the environment scales — "web can reach app" survives every IP change.',
    how: 'You assign NICs to the ASG, then reference the ASG as the source or destination in NSG rules.',
    checks: [
      'Both the source and destination ASG must be in the SAME virtual network for a rule to work.',
      'Confirm the NIC really is a member — an unassigned NIC silently falls through to the deny rule.',
    ],
    docs: 'https://learn.microsoft.com/azure/virtual-network/application-security-groups',
  },

  // ---------------------------------------------------------- People & UI
  'people-client': {
    what: 'A client application or device making the request.',
    why: 'It marks where the user-visible experience begins, which is the perspective the customer is reporting from.',
    how: 'It resolves the target name through DNS and then connects to the returned address.',
    checks: ['Check what the client resolves the name to, and from which network it is connecting.'],
  },
  'people-admin': {
    what: 'An administrator performing management or troubleshooting work.',
    why: 'Management traffic often takes a completely different path from application traffic and has its own controls.',
    how: 'Admins usually reach resources through the Azure portal, Bastion, or a jump host rather than the application front door.',
    checks: ['Confirm the admin path (Bastion, VPN, or portal) separately — it can fail while the app path works.'],
  },
  'people-azure-portal': {
    what: 'The Azure portal — the browser-based management plane at portal.azure.com.',
    why: 'It is the control plane. Control-plane and data-plane failures look similar to users but have different causes.',
    how: 'Portal actions call Azure Resource Manager over HTTPS; they do not traverse your VNet.',
    checks: ['A portal error is control plane (ARM, RBAC, policy) — it is not evidence of a data-path problem.'],
  },
  'people-terminal': {
    what: 'A command-line session such as PowerShell, Bash, or Azure CLI.',
    why: 'It represents scripted or interactive commands, which are often where the reproduction steps live.',
    how: 'It reaches Azure APIs over HTTPS, or reaches workloads directly over SSH, RDP, or an application port.',
    checks: ['Capture the exact command and full error text — it usually names the failing endpoint and port.'],
  },
  'people-mobile': {
    what: 'A mobile device acting as the client.',
    why: 'Mobile clients frequently arrive over carrier networks or a Point-to-Site VPN, so their path differs from office clients.',
    how: 'It connects over the public internet unless a VPN profile is applied.',
    checks: ['Test on and off the corporate network — a split-tunnel VPN policy often explains "works for some users".'],
  },
  'people-laptop': {
    what: 'A user laptop or workstation.',
    why: 'It is the most common place a reported issue is actually observed.',
    how: 'It connects from the office LAN, from home, or through a VPN client, and each path resolves DNS differently.',
    checks: ['Compare a lookup and a connection test from the laptop against the same test run inside Azure.'],
  },
  'people-server': {
    what: 'A server — typically an on-premises or third-party host outside Azure.',
    why: 'Hybrid flows depend on it, and it is frequently the piece nobody has console access to during a call.',
    how: 'It reaches Azure across a VPN tunnel or ExpressRoute circuit, or over the public internet.',
    checks: [
      'Confirm the local firewall and any host-based firewall permit the flow in both directions.',
      'Check the route on the server itself — it must know to send the Azure prefixes to the tunnel.',
    ],
  },
  'people-stick-figure': {
    what: 'A person or role involved in the flow.',
    why: 'It clarifies who experiences the behaviour being described.',
    how: 'Used as a generic actor when the exact device does not matter.',
  },

  // ---------------------------------------------------------------- Other
  custom: {
    what: 'A custom element added to represent something outside the standard Azure resource set.',
    why: 'Real environments contain third-party appliances, SaaS endpoints, and legacy systems that still shape the traffic path.',
    how: 'Treat it like any other hop: confirm what it listens on, what it forwards to, and who controls its rules.',
  },
};

/** Well-known ports, used to explain numbers found in edge labels. */
const PORT_MEANINGS: Record<string, string> = {
  '22': 'SSH (secure shell — Linux remote administration)',
  '53': 'DNS (name resolution — uses UDP first, falling back to TCP for large answers or zone transfers)',
  '80': 'HTTP (unencrypted web traffic)',
  '389': 'LDAP (directory lookups)',
  '443': 'HTTPS (TLS-encrypted web traffic)',
  '445': 'SMB (Windows / Azure Files file sharing)',
  '500': 'IKE (VPN tunnel negotiation)',
  '636': 'LDAPS (TLS-encrypted directory lookups)',
  '1433': 'SQL Server / Azure SQL Database',
  '3306': 'MySQL',
  '3389': 'RDP (Windows remote desktop)',
  '4500': 'IPsec NAT-Traversal (VPN traffic when a NAT device is in the path)',
  '5432': 'PostgreSQL',
  '5671': 'AMQP over TLS (Service Bus / Event Hubs)',
  '6379': 'Redis',
  '8080': 'HTTP alternate (commonly an application or proxy listener)',
  '10250': 'Cosmos DB direct-mode data traffic',
  '11000': 'Azure SQL redirect-mode data traffic (range 11000-11999)',
  '27017': 'MongoDB',
};

/**
 * Pull port numbers out of a free-text edge label (for example
 * "UDP/TCP 53 over VPN" or "HTTPS 443") and return a one-line explanation
 * for each recognised port. Returns null when nothing is recognised.
 *
 * v0.9.45 — this lost its only call site when the walkthrough was removed.
 * Kept deliberately: it is fact-checked knowledge content, not feature code,
 * and the EdgePanel already renders `EDGE_KNOWLEDGE` right where a port
 * explanation for the selected edge belongs.
 */
export function explainPorts(label: string | undefined): string | null {
  if (!label) return null;
  const found = new Set<string>();
  // Match standalone 2-5 digit numbers, and ranges like 11000-11999.
  const re = /\b(\d{2,5})(?:\s*-\s*(\d{2,5}))?\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(label)) !== null) {
    if (PORT_MEANINGS[m[1]]) found.add(m[1]);
  }
  if (found.size === 0) return null;
  const parts = [...found].map((p) => `Port ${p} is ${PORT_MEANINGS[p]}.`);

  const upper = label.toUpperCase();
  const hasUdp = /\bUDP\b/.test(upper);
  const hasTcp = /\bTCP\b/.test(upper);
  if (hasUdp && hasTcp) {
    parts.push('Both UDP and TCP must be allowed — blocking one of them causes intermittent failures that are easy to misread as a routing problem.');
  } else if (hasUdp) {
    parts.push('UDP is connectionless, so there is no handshake to observe — an absent reply is the only symptom.');
  }
  return parts.join(' ');
}

/** Explanation of the connection TYPE itself, keyed by EdgeKind. */
export const EDGE_KNOWLEDGE: Record<string, { what: string; why: string; checks: string[] }> = {
  peering: {
    what: 'VNet peering privately connects two virtual networks so their resources can talk using private IP addresses.',
    why: 'It gives low-latency, high-bandwidth connectivity between VNets without a gateway, VPN, or public exposure.',
    checks: [
      'Peering is NOT transitive — A-to-B and B-to-C does not give A-to-C without gateway transit or a UDR through an appliance.',
      'Both peering links must show Connected; a one-sided peering does not pass traffic.',
      'Enable "Allow gateway transit" on the hub and "Use remote gateway" on the spoke for hybrid connectivity.',
      'Address spaces must not overlap.',
    ],
  },
  vpn: {
    what: 'A Site-to-Site VPN carries traffic inside an encrypted IPsec/IKE tunnel over the public internet.',
    why: 'It is the quickest way to get private hybrid connectivity, with no carrier provisioning lead time.',
    checks: [
      'Phase 1 and phase 2 parameters, plus the shared key, must match exactly on both ends.',
      'Confirm the traffic selectors or Local Network Gateway prefixes include the specific subnets in this flow.',
      'Throughput and latency depend on the internet path — check for packet loss before blaming Azure.',
      'UDP 500 and UDP 4500 must be open on the on-premises firewall.',
    ],
  },
  expressroute: {
    what: 'ExpressRoute is a private Layer-3 circuit between your network and Microsoft, provided by a connectivity partner.',
    why: 'It gives predictable latency, higher and more consistent bandwidth, and an SLA, because traffic never touches the public internet.',
    checks: [
      'Check BGP session state and the received route count on both the primary and secondary link.',
      'Route limits apply — exceeding them drops the session.',
      'Confirm which peering the flow uses: private peering for VNets, Microsoft peering for Microsoft public services.',
    ],
  },
  privateendpoint: {
    what: 'A Private Endpoint connection reaches a PaaS service through a private IP inside your own subnet.',
    why: 'It keeps the traffic on the Microsoft backbone and lets you turn off the service public endpoint entirely.',
    checks: [
      'DNS must resolve the service hostname to the private IP — this is the most common failure by a wide margin.',
      'Confirm the relevant privatelink DNS zone is linked to the client VNet.',
      'On-premises clients need a conditional forwarder or DNS Private Resolver to get the same private answer.',
    ],
  },
  backend: {
    what: 'Backend-pool traffic — the load balancer or gateway forwarding a request to a member instance.',
    why: 'It is the hop where a healthy front end can still fail, because only healthy pool members receive traffic.',
    checks: [
      'Check the health probe result for every pool member.',
      'Confirm the NSG on the backend allows the probe source and the data port.',
      'Verify the application is listening on the backend port that the rule targets.',
    ],
  },
  dns: {
    what: 'A DNS query — the client asking what IP address a name maps to.',
    why: 'DNS decides where the traffic goes. A wrong answer sends an otherwise perfect network path to the wrong destination.',
    checks: [
      'Run the lookup from the client itself and compare it with the expected address.',
      'Confirm which DNS server the client is actually using.',
      'Check that UDP AND TCP port 53 are permitted end to end.',
      'Cached answers persist past a fix — flush the cache before retesting.',
    ],
  },
  internet: {
    what: 'A public-internet request arriving at, or leaving from, your environment.',
    why: 'This is the least controlled part of the path, and the part most often restricted by an intermediate firewall or proxy.',
    checks: [
      'For inbound, confirm the public IP, the NSG rule, and backend health.',
      'For outbound, confirm an explicit egress method exists (NAT Gateway, load balancer, or firewall).',
      'Check whether a corporate proxy or TLS-inspection device sits in the path.',
    ],
  },
  link: {
    what: 'A general connection between two components in this design.',
    why: 'It shows a dependency — if this link breaks, the destination becomes unreachable from the source.',
    checks: [
      'Confirm the route from source to destination with Network Watcher next hop.',
      'Confirm no NSG or firewall rule denies the specific port in use.',
    ],
  },
};
