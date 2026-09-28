import type { Dict } from './strings';

/**
 * Per-resource "Details" prose — the deep dives that `resource-knowledge.ts`
 * supplies (what / why / how / checks), rendered by the Property Panel.
 *
 * Split out of `strings.ts` purely for file size: this is 323 keys per
 * language. `strings.ts` merges both into `DICT`.
 *
 * Rules when adding a language:
 *  - `resource-knowledge.ts` itself is NEVER translated. The English source
 *    text is the lookup key, so translation happens at render time in
 *    `PropertyPanel`. Keys here must match that source byte for byte.
 *  - Azure product and resource names stay in English, matching Microsoft's
 *    own localised docs (VNet, NSG, ExpressRoute, Private Endpoint, ...).
 *  - Technical tokens stay verbatim: port numbers, service tags, CIDR blocks,
 *    zone names such as `privatelink.blob.core.windows.net`, and CLI names.
 *  - A missing key is not a bug — `translate()` falls back to English.
 */

const ja: Dict = {
  'A 0.0.0.0/0 route with next hop None or a stale appliance IP blackholes all outbound traffic.':
    'ネクストホップが None の 0.0.0.0/0 ルート、または古いアプライアンス IP を指すルートがあると、すべての送信トラフィックがブラックホール化します。',
  'A 403 is authorisation (RBAC or access policy); a connection timeout is network.':
    '403 は認可の問題 (RBAC またはアクセスポリシー)、接続タイムアウトはネットワークの問題です。',
  'A 403 usually means authorisation or firewall; a name-resolution failure means DNS.':
    '403 は通常、認可またはファイアウォールの問題を示し、名前解決の失敗は DNS の問題を示します。',
  'A Connection is the resource that pairs an Azure gateway with the remote side — a Local Network Gateway, another VNet gateway, or an ExpressRoute circuit.':
    'Connection は、Azure 側のゲートウェイとリモート側 (Local Network Gateway、別の VNet ゲートウェイ、または ExpressRoute 回線) を結び付けるリソースです。',
  'A DDoS Protection plan adds always-on traffic monitoring and adaptive mitigation for public IPs in protected VNets.':
    'DDoS Protection プランは、保護対象 VNet 内のパブリック IP に対して、常時監視と適応型の緩和機能を追加します。',
  'A DNS zone holds the records that translate names into IP addresses. A Private DNS Zone is only visible to VNets that are linked to it.':
    'DNS ゾーンは、名前を IP アドレスに変換するレコードを保持します。プライベート DNS ゾーンは、リンクされている VNet からのみ参照できます。',
  'A Function App runs small pieces of event-driven code, billed by execution.':
    'Function App は、イベント駆動の小さなコードを実行し、実行回数に応じて課金されます。',
  'A Local Network Gateway is the Azure object that describes your on-premises VPN device — its public IP and the prefixes behind it.':
    'Local Network Gateway は、オンプレミスの VPN デバイス (パブリック IP と、その背後にあるプレフィックス) を表す Azure 上のオブジェクトです。',
  'A NIC is the virtual network adapter that attaches a VM to a subnet and holds its private IP.':
    'NIC は、VM をサブネットに接続し、プライベート IP を保持する仮想ネットワークアダプターです。',
  'A Private DNS Zone is linked to one or more VNets. With auto-registration enabled, VMs in a linked VNet register their own records.':
    'プライベート DNS ゾーンは 1 つ以上の VNet にリンクされます。自動登録を有効にすると、リンク先 VNet 内の VM が自身のレコードを登録します。',
  'A Private Endpoint is a NIC in your subnet that holds a private IP mapped to a specific PaaS resource.':
    'Private Endpoint は、特定の PaaS リソースにマップされたプライベート IP を保持する、サブネット内の NIC です。',
  'A Public IP Prefix is a contiguous block of public addresses reserved for your subscription.':
    'Public IP Prefix は、サブスクリプション用に予約された連続したパブリックアドレスのブロックです。',
  'A Public IP is an internet-routable address assigned to a gateway, load balancer, firewall, or VM NIC.':
    'パブリック IP は、ゲートウェイ、ロードバランサー、ファイアウォール、または VM の NIC に割り当てられる、インターネットでルーティング可能なアドレスです。',
  'A Scale Set manages an identical group of VMs that grows and shrinks automatically.':
    'スケールセットは、自動的に増減する同一構成の VM グループを管理します。',
  'A Storage Account holds blobs, files, queues, and tables behind a public hostname per service.':
    'ストレージアカウントは、BLOB、ファイル、キュー、テーブルを、サービスごとのパブリックホスト名の背後で保持します。',
  'A VPN Gateway terminates encrypted IPsec/IKE tunnels between Azure and an on-premises device or remote user.':
    'VPN Gateway は、Azure とオンプレミスのデバイスまたはリモートユーザーとの間の、暗号化された IPsec/IKE トンネルを終端します。',
  'A Virtual Machine is a server you run in Azure, with its own operating system and applications.':
    '仮想マシンは、独自のオペレーティングシステムとアプリケーションを持つ、Azure 上で実行するサーバーです。',
  'A Virtual Network is your private, isolated network in Azure, defined by one or more address ranges (CIDR blocks).':
    '仮想ネットワークは、1 つ以上のアドレス範囲 (CIDR ブロック) で定義される、Azure 上のプライベートで分離されたネットワークです。',
  'A Virtual WAN hub is the Microsoft-managed regional hub VNet that spokes and branches connect into.':
    'Virtual WAN ハブは、スポークや拠点が接続する、Microsoft が管理するリージョナルハブ VNet です。',
  'A WAF policy is the rule set that inspects HTTP requests for common web attacks such as SQL injection and cross-site scripting.':
    'WAF ポリシーは、SQL インジェクションやクロスサイトスクリプティングなど、一般的な Web 攻撃を検出するために HTTP リクエストを検査するルールセットです。',
  'A client application or device making the request.': 'リクエストを行うクライアントアプリケーションまたはデバイスです。',
  'A command-line session such as PowerShell, Bash, or Azure CLI.':
    'PowerShell、Bash、Azure CLI などのコマンドラインセッションです。',
  'A custom element added to represent something outside the standard Azure resource set.':
    '標準の Azure リソースに含まれないものを表すために追加された、カスタム要素です。',
  'A legitimate request being blocked shows up as a 403 — check the WAF logs for the triggering rule ID and add an exclusion.':
    '正当なリクエストがブロックされると 403 として現れます。WAF ログで該当するルール ID を確認し、除外設定を追加してください。',
  'A listener accepts the request on the front-end IP, a rule matches it, and the request is forwarded to a backend pool member that the health probe reports as healthy.':
    'リスナーがフロントエンド IP でリクエストを受け取り、ルールが一致すると、正常性プローブで正常と判定されたバックエンドプールのメンバーへ転送されます。',
  'A load-balancing rule maps a front-end IP and port to a backend pool and port. It does not inspect or modify the payload, so it cannot route by URL.':
    '負荷分散規則は、フロントエンドの IP とポートをバックエンドプールとポートにマップします。ペイロードの検査や変更は行わないため、URL によるルーティングはできません。',
  'A missing or wrong prefix here is the single most common cause of "the tunnel is up but traffic does not pass".':
    'ここでプレフィックスが不足していたり誤っていたりすることが、「トンネルは確立しているのに通信が通らない」原因として最も多いものです。',
  'A mobile device acting as the client.': 'クライアントとして動作するモバイルデバイスです。',
  'A person or role involved in the flow.': 'このフローに関わる人物または役割です。',
  'A portal error is control plane (ARM, RBAC, policy) — it is not evidence of a data-path problem.':
    'ポータルのエラーはコントロールプレーン (ARM、RBAC、ポリシー) の問題であり、データパスの問題を示す証拠にはなりません。',
  'A resource group is a logical container that holds related Azure resources.':
    'リソースグループは、関連する Azure リソースをまとめる論理的なコンテナーです。',
  'A resource group is a management construct only — it does not affect network reachability. Two resources in different resource groups talk to each other normally.':
    'リソースグループは管理上の構成要素にすぎず、ネットワークの到達性には影響しません。異なるリソースグループにある 2 つのリソースも、問題なく通信できます。',
  'A route table holds User-Defined Routes that override the routes Azure creates by default.':
    'ルートテーブルは、Azure が既定で作成するルートを上書きするユーザー定義ルートを保持します。',
  'A server — typically an on-premises or third-party host outside Azure.':
    'サーバーです。通常は Azure の外にあるオンプレミスまたはサードパーティのホストを指します。',
  'A subnet is a slice of the VNet address space where resources actually get their IP addresses.':
    'サブネットは、リソースが実際に IP アドレスを取得する、VNet アドレス空間の一部分です。',
  'A subscription is the billing and quota boundary that resources are created in.':
    'サブスクリプションは、リソースが作成される課金とクォータの境界です。',
  'A user laptop or workstation.': 'ユーザーのノート PC またはワークステーションです。',
  'AKS is managed Kubernetes — Azure runs the control plane and you run workloads in node pools.':
    'AKS はマネージド Kubernetes です。コントロールプレーンは Azure が運用し、ワークロードはノードプールで実行します。',
  'API Management is a gateway that publishes, secures, and throttles APIs.':
    'API Management は、API の公開、保護、スロットリングを行うゲートウェイです。',
  'Access can be restricted with the firewall and virtual network rules, or made fully private with a Private Endpoint per sub-resource (blob, file, and so on).':
    'アクセスはファイアウォール規則と仮想ネットワーク規則で制限できるほか、サブリソース (blob、file など) ごとの Private Endpoint により完全にプライベート化できます。',
  'Admins usually reach resources through the Azure portal, Bastion, or a jump host rather than the application front door.':
    '管理者は通常、アプリケーションのフロントドアではなく、Azure portal、Bastion、または踏み台ホスト経由でリソースにアクセスします。',
  'An ASG is a label you attach to NICs so NSG rules can target a workload role instead of IP addresses.':
    'ASG は NIC に付けるラベルで、NSG 規則が IP アドレスではなくワークロードの役割を対象にできるようにします。',
  'An Azure region is a set of datacenters in one geography that hosts your resources.':
    'Azure リージョンは、リソースをホストする 1 つの地理的領域内のデータセンター群です。',
  'An ExpressRoute Gateway is the VNet-side endpoint that attaches a VNet to an ExpressRoute circuit.':
    'ExpressRoute Gateway は、VNet を ExpressRoute 回線に接続する VNet 側のエンドポイントです。',
  'An ExpressRoute circuit is a private Layer-3 connection between your network and Microsoft, provided by a connectivity partner.':
    'ExpressRoute 回線は、接続プロバイダーが提供する、お客様のネットワークと Microsoft の間のプライベートなレイヤー 3 接続です。',
  'An INBOUND endpoint gives on-premises an IP in Azure to forward queries to. An OUTBOUND endpoint plus a forwarding ruleset sends Azure queries for specific domains to on-premises DNS servers.':
    '受信エンドポイントは、オンプレミスがクエリを転送するための Azure 側 IP を提供します。送信エンドポイントと転送ルールセットを組み合わせると、特定ドメイン宛ての Azure からのクエリをオンプレミスの DNS サーバーへ送信できます。',
  'An IP Group is a named, reusable collection of IP addresses and ranges.':
    'IP グループは、IP アドレスと範囲をまとめた、名前付きで再利用可能なコレクションです。',
  'An NSG and a route table are attached at the subnet level, so every resource in the subnet inherits those rules. Some services require a dedicated, specially-named subnet (for example GatewaySubnet, AzureFirewallSubnet, AzureBastionSubnet).':
    'NSG とルートテーブルはサブネット単位で関連付けられるため、サブネット内のすべてのリソースがその規則を継承します。一部のサービスは、専用かつ特定の名前のサブネット (GatewaySubnet、AzureFirewallSubnet、AzureBastionSubnet など) を必要とします。',
  'An NSG is a stateful packet filter with allow and deny rules based on source, destination, port, and protocol.':
    'NSG は、送信元、宛先、ポート、プロトコルに基づく許可/拒否規則を持つ、ステートフルなパケットフィルターです。',
  'An NVA is a third-party firewall, router, or proxy running as a VM inside your VNet.':
    'NVA は、VNet 内で VM として動作するサードパーティ製のファイアウォール、ルーター、またはプロキシです。',
  'An administrator performing management or troubleshooting work.':
    '管理作業やトラブルシューティングを行う管理者です。',
  'An image pull failure over Private Link is nearly always DNS — verify the registry name resolves to the private IP.':
    'Private Link 経由でのイメージ取得の失敗は、ほぼ必ず DNS が原因です。レジストリ名がプライベート IP に解決されることを確認してください。',
  'App Service is a managed platform for hosting web apps and APIs without managing servers.':
    'App Service は、サーバーを管理せずに Web アプリや API をホストできるマネージドプラットフォームです。',
  'Application Gateway for Containers is the Kubernetes-native Layer-7 ingress built on the Application Gateway platform.':
    'Application Gateway for Containers は、Application Gateway 基盤上に構築された、Kubernetes ネイティブなレイヤー 7 イングレスです。',
  'Application Gateway is a regional Layer-7 (HTTP/HTTPS) load balancer.':
    'Application Gateway は、リージョナルなレイヤー 7 (HTTP/HTTPS) ロードバランサーです。',
  'Application rules need the FQDN; if the client resolves DNS differently, the rule will not match.':
    'アプリケーション規則には FQDN が必要です。クライアントの DNS 解決結果が異なると、規則は一致しません。',
  'Asymmetric routing is a classic failure — the return path must also traverse the firewall.':
    '非対称ルーティングは典型的な障害要因です。戻りの経路も同じファイアウォールを通過する必要があります。',
  'Azure Bastion is a managed jump host that gives browser-based RDP and SSH access to VMs.':
    'Azure Bastion は、ブラウザーから VM への RDP および SSH アクセスを提供する、マネージドな踏み台ホストです。',
  'Azure Container Registry stores and serves your container images.':
    'Azure Container Registry は、コンテナーイメージを保存し、配信します。',
  'Azure Firewall is a managed, stateful network firewall that inspects traffic against DNAT, network, and application rules.':
    'Azure Firewall は、DNAT 規則、ネットワーク規則、アプリケーション規則に照らしてトラフィックを検査する、マネージドかつステートフルなネットワークファイアウォールです。',
  'Azure Firewall rules reference the IP Group by name in the source or destination field.':
    'Azure Firewall の規則では、送信元または宛先フィールドで IP グループを名前で参照します。',
  'Azure Load Balancer is a Layer-4 (TCP/UDP) load balancer that spreads connections across a backend pool.':
    'Azure Load Balancer は、バックエンドプール全体に接続を分散する、レイヤー 4 (TCP/UDP) のロードバランサーです。',
  'Azure SQL Database is a managed relational database service.':
    'Azure SQL Database は、マネージドなリレーショナルデータベースサービスです。',
  'Azure needs to know which address ranges live on the far side of the tunnel so it can route to them.':
    'Azure がトンネルの向こう側へルーティングできるよう、対向側に存在するアドレス範囲を Azure に知らせる必要があります。',
  'Azure protects its platform by default, but a Network Protection plan tunes mitigation to YOUR traffic and adds attack telemetry plus cost protection.':
    'Azure は既定でプラットフォームを保護しますが、Network Protection プランを使うと、お客様のトラフィックに合わせて緩和策が調整され、攻撃テレメトリとコスト保護も追加されます。',
  'Because it is DNS-based, client-side DNS caching and TTL delay failover — check the TTL.':
    'DNS ベースの仕組みであるため、クライアント側の DNS キャッシュと TTL によってフェールオーバーが遅延します。TTL を確認してください。',
  'Both the source and destination ASG must be in the SAME virtual network for a rule to work.':
    '規則が機能するには、送信元と宛先の ASG が同一の仮想ネットワークに存在する必要があります。',
  'Caching can mask a backend change — purge before concluding the backend is wrong.':
    'キャッシュがバックエンドの変更を覆い隠すことがあります。バックエンドに問題があると判断する前にパージしてください。',
  'Capture the exact command and full error text — it usually names the failing endpoint and port.':
    '実行したコマンドとエラーメッセージ全文をそのまま取得してください。通常、失敗しているエンドポイントとポートが記載されています。',
  'Check BGP session state and the advertised/received route counts on each peering.':
    '各ピアリングについて、BGP セッションの状態と、アドバタイズ済み/受信済みのルート数を確認してください。',
  'Check DDoS mitigation metrics before assuming an outage is application-side.':
    '障害がアプリケーション側にあると判断する前に、DDoS 緩和のメトリックを確認してください。',
  'Check SNAT port utilisation metrics if outbound connections start failing intermittently.':
    '送信接続が断続的に失敗し始めた場合は、SNAT ポート使用率のメトリックを確認してください。',
  'Check backend health first — an unhealthy pool returns 502.':
    'まずバックエンドの正常性を確認してください。プールが異常な状態だと 502 が返されます。',
  'Check connection status and the ingress/egress byte counters — zero bytes with a Connected state points at routing, not the tunnel.':
    '接続状態と送受信バイトカウンターを確認してください。状態が Connected なのにバイト数が 0 の場合は、トンネルではなくルーティングの問題を示します。',
  'Check container logs and restart count first — an app crash looks like a network failure from outside.':
    'まずコンテナーのログと再起動回数を確認してください。アプリのクラッシュは、外から見るとネットワーク障害のように見えます。',
  'Check effective routes and effective security rules on the NIC.':
    'NIC の有効なルートと有効なセキュリティ規則を確認してください。',
  'Check effective routes on a NIC in this VNet to see what next hop Azure is actually using.':
    'この VNet 内の NIC で有効なルートを確認し、Azure が実際に使用しているネクストホップを調べてください。',
  'Check effective routes on the NIC — that is the ground truth, not the route table definition.':
    'NIC の有効なルートを確認してください。ルートテーブルの定義ではなく、そちらが実際の動作を表します。',
  'Check endpoint monitor status; an endpoint marked Degraded is removed from responses.':
    'エンドポイントの監視状態を確認してください。Degraded と表示されたエンドポイントは応答から除外されます。',
  'Check for a delete lock or Azure Policy assignment at this scope if a deployment is failing.':
    'デプロイが失敗する場合は、このスコープに削除ロックや Azure Policy の割り当てがないか確認してください。',
  'Check for asymmetric routing — both directions must traverse the same appliance instance.':
    '非対称ルーティングがないか確認してください。両方向が同一のアプライアンスインスタンスを通過する必要があります。',
  'Check health probe status — if every instance is unhealthy the load balancer silently drops traffic.':
    '正常性プローブの状態を確認してください。すべてのインスタンスが異常な場合、ロードバランサーは無言でトラフィックを破棄します。',
  'Check hub routing status and the effective routes for the connection in question.':
    'ハブのルーティング状態と、該当する接続の有効なルートを確認してください。',
  'Check origin health probes and the origin host header setting — a mismatch causes 4xx from the origin.':
    'オリジンの正常性プローブと、オリジンのホストヘッダー設定を確認してください。不一致があるとオリジンから 4xx が返ります。',
  'Check priority ordering — a broad deny in a parent policy silently overrides a child allow.':
    '優先順位を確認してください。親ポリシーの広範な拒否規則が、子ポリシーの許可規則を無言で上書きします。',
  'Check that the on-premises prefixes are present in the Local Network Gateway (or advertised via BGP).':
    'オンプレミスのプレフィックスが Local Network Gateway に登録されている (または BGP でアドバタイズされている) ことを確認してください。',
  'Check that the on-premises router actually advertises the local prefixes, and that it learns the Azure address space.':
    'オンプレミスのルーターがローカルプレフィックスを実際にアドバタイズし、Azure のアドレス空間を学習していることを確認してください。',
  'Check the A record exists and points at the expected IP.':
    'A レコードが存在し、想定どおりの IP を指していることを確認してください。',
  'Check the ALB controller pod logs in the cluster.': 'クラスター内の ALB コントローラー Pod のログを確認してください。',
  'Check the NSG attached to this subnet — subnet rules are evaluated before NIC rules for inbound traffic.':
    'このサブネットに関連付けられた NSG を確認してください。受信トラフィックでは、サブネットの規則が NIC の規則より先に評価されます。',
  'Check the connection state is Approved, not Pending.':
    '接続の状態が Pending ではなく Approved になっていることを確認してください。',
  'Check the default rules — DenyAllInbound at priority 65500 catches anything you did not explicitly allow.':
    '既定の規則を確認してください。優先度 65500 の DenyAllInbound が、明示的に許可していないすべての通信を拒否します。',
  'Check the effective routes on the hub route table, not just on the spoke.':
    'スポーク側だけでなく、ハブのルートテーブルでも有効なルートを確認してください。',
  'Check the firewall logs for the specific flow — they tell you which rule allowed or denied it.':
    '該当するフローについてファイアウォールのログを確認してください。どの規則が許可または拒否したかが分かります。',
  'Check the forwarding ruleset is linked to the VNet, and that the rule domain name ends with a trailing dot.':
    '転送ルールセットが VNet にリンクされていること、およびルールのドメイン名が末尾のドットで終わっていることを確認してください。',
  'Check the number of routes learned — exceeding the route limit drops the BGP session.':
    '学習したルート数を確認してください。ルート数の上限を超えると BGP セッションが切断されます。',
  'Check the policy trace for the failing call — the answer is usually a policy, not the network.':
    '失敗している呼び出しについてポリシートレースを確認してください。原因は通常ネットワークではなくポリシーです。',
  'Check the route on the server itself — it must know to send the Azure prefixes to the tunnel.':
    'サーバー自体のルートを確認してください。Azure のプレフィックス宛て通信をトンネルへ送るよう設定されている必要があります。',
  'Check the route table attached to this subnet for a UDR that overrides the default system route.':
    'このサブネットに関連付けられたルートテーブルに、既定のシステムルートを上書きする UDR がないか確認してください。',
  'Check the service is actually available in this region (some SKUs are region-limited).':
    '対象のサービスがこのリージョンで実際に利用できることを確認してください (一部の SKU はリージョンが限定されます)。',
  'Check the service type — ClusterIP is cluster-internal only, LoadBalancer creates an Azure load balancer.':
    'Service の種類を確認してください。ClusterIP はクラスター内部専用で、LoadBalancer は Azure のロードバランサーを作成します。',
  'Check what the client resolves the name to, and from which network it is connecting.':
    'クライアントがその名前を何に解決しているか、またどのネットワークから接続しているかを確認してください。',
  'Check whether Access Restrictions are blocking the caller.':
    'アクセス制限によって呼び出し元がブロックされていないか確認してください。',
  'Check whether the client is on the corporate network, on VPN, or on the public internet, because the path differs.':
    'クライアントが社内ネットワーク、VPN、パブリックインターネットのいずれにいるかを確認してください。経路が異なります。',
  'Check whether unhealthy instances are being rolled — an instance can be up but failing its probe.':
    '異常なインスタンスが入れ替えられていないか確認してください。インスタンスが起動していてもプローブに失敗している場合があります。',
  'Circuits are redundant by design — verify BOTH links, not just the primary.':
    '回線は設計上冗長化されています。プライマリだけでなく両方のリンクを確認してください。',
  'Client-side caching can hide a fix — flush the resolver cache before retesting.':
    'クライアント側のキャッシュが修正結果を覆い隠すことがあります。再テストの前にリゾルバーのキャッシュをクリアしてください。',
  'Compare a lookup and a connection test from the laptop against the same test run inside Azure.':
    'ノート PC からの名前解決と接続テストの結果を、Azure 内で実行した同じテストの結果と比較してください。',
  'Compare the IPsec policy on this connection with the on-premises configuration line by line.':
    'この接続の IPsec ポリシーと、オンプレミス側の設定を 1 行ずつ突き合わせてください。',
  'Compute platforms need somewhere private and close to pull images from at deployment time.':
    'コンピューティング基盤には、デプロイ時にイメージを取得するための、プライベートで近接した場所が必要です。',
  'Confirm IP forwarding is enabled if this NIC belongs to an NVA that must route traffic for others.':
    'この NIC が他のトラフィックをルーティングする NVA のものである場合は、IP 転送が有効になっていることを確認してください。',
  'Confirm a UDR actually forces the traffic through the firewall; without it traffic bypasses the firewall entirely.':
    'UDR によって実際にトラフィックがファイアウォールを経由するようになっているか確認してください。UDR がないとトラフィックはファイアウォールを完全に迂回します。',
  'Confirm a virtual network link exists between the zone and the client VNet — without it the zone is invisible.':
    'ゾーンとクライアント側 VNet の間に仮想ネットワークリンクが存在することを確認してください。リンクがないとゾーンは参照できません。',
  'Confirm backend certificate validation settings if the backend uses a private CA.':
    'バックエンドがプライベート CA を使用している場合は、バックエンド証明書の検証設定を確認してください。',
  'Confirm both sides of the flow are in the region you expect — cross-region hops add latency and egress charges.':
    'フローの両端が想定どおりのリージョンにあることを確認してください。リージョンをまたぐホップは遅延と送信データ料金を増やします。',
  'Confirm the NIC really is a member — an unassigned NIC silently falls through to the deny rule.':
    'その NIC が実際にメンバーになっていることを確認してください。未割り当ての NIC は無言で拒否規則に到達します。',
  'Confirm the NSG on the Application Gateway subnet allows the required inbound ports from the GatewayManager service tag.':
    'Application Gateway のサブネットに関連付けられた NSG が、GatewayManager サービスタグからの必要な受信ポートを許可していることを確認してください。',
  'Confirm the NSG on the backend NICs or subnet allows the probe source (AzureLoadBalancer service tag) and the data port.':
    'バックエンドの NIC またはサブネットの NSG が、プローブ送信元 (AzureLoadBalancer サービスタグ) とデータポートを許可していることを確認してください。',
  'Confirm the Private DNS Zone is linked to the VNet the client sits in, and that the A record exists.':
    'プライベート DNS ゾーンがクライアントの所属する VNet にリンクされていること、および A レコードが存在することを確認してください。',
  'Confirm the UDR next hop points at the NVA private IP (or the internal load balancer front end for an HA pair).':
    'UDR のネクストホップが NVA のプライベート IP (HA 構成の場合は内部ロードバランサーのフロントエンド) を指していることを確認してください。',
  'Confirm the VNet DNS setting (Azure-provided vs custom DNS servers) matches what the workload expects.':
    'VNet の DNS 設定 (Azure 提供 DNS かカスタム DNS サーバーか) が、ワークロードの想定と一致していることを確認してください。',
  'Confirm the VNet connection propagates to, and associates with, the route tables you expect.':
    'VNet 接続が、想定どおりのルートテーブルに伝播および関連付けされていることを確認してください。',
  'Confirm the VNet is actually associated with the plan.': 'VNet が実際にプランへ関連付けられていることを確認してください。',
  'Confirm the address is actually associated with the resource you think it is.':
    'そのアドレスが、想定しているリソースに実際に関連付けられていることを確認してください。',
  'Confirm the address you expect is really in the group — a missing entry looks exactly like a firewall deny.':
    '想定しているアドレスが実際にグループへ含まれていることを確認してください。エントリの欠落は、ファイアウォールの拒否とまったく同じように見えます。',
  'Confirm the admin path (Bastion, VPN, or portal) separately — it can fail while the app path works.':
    '管理経路 (Bastion、VPN、ポータル) は別途確認してください。アプリの経路が正常でも管理経路だけ失敗することがあります。',
  'Confirm the application is actually listening on the expected port (netstat or ss).':
    'アプリケーションが想定どおりのポートで実際にリッスンしていることを確認してください (netstat または ss)。',
  'Confirm the association subnet is delegated correctly and has free addresses.':
    '関連付け用サブネットが正しく委任され、空きアドレスがあることを確認してください。',
  'Confirm the circuit status is Provisioned and the peering is configured on both the provider and Microsoft side.':
    '回線の状態が Provisioned であること、およびピアリングがプロバイダー側と Microsoft 側の両方で構成されていることを確認してください。',
  'Confirm the consumer connection request has been approved.':
    'コンシューマー側からの接続要求が承認されていることを確認してください。',
  'Confirm the gateway SKU supports the required throughput and the number of circuit connections.':
    'ゲートウェイの SKU が、必要なスループットと回線接続数に対応していることを確認してください。',
  'Confirm the local firewall and any host-based firewall permit the flow in both directions.':
    'ローカルのファイアウォールおよびホストベースのファイアウォールが、双方向の通信を許可していることを確認してください。',
  'Confirm the on-premises conditional forwarder points at the inbound endpoint IP, and that UDP and TCP port 53 are open across the tunnel.':
    'オンプレミスの条件付きフォワーダーが受信エンドポイントの IP を指していること、およびトンネル経由で UDP と TCP のポート 53 が開いていることを確認してください。',
  'Confirm the on-premises firewall permits the required ports in BOTH directions.':
    'オンプレミスのファイアウォールが、必要なポートを双方向で許可していることを確認してください。',
  'Confirm the origin only accepts traffic from Front Door (X-Azure-FDID header or the AzureFrontDoor.Backend service tag).':
    'オリジンが Front Door からのトラフィックのみを受け付ける構成になっていることを確認してください (X-Azure-FDID ヘッダー、または AzureFrontDoor.Backend サービスタグ)。',
  'Confirm the hosting plan supports the networking feature you need — the classic Consumption plan has no VNet integration, while Flex Consumption and Premium do.': '必要なネットワーク機能をホスティング プランがサポートしているか確認してください。従来の Consumption プランには VNet 統合がありませんが、Flex Consumption と Premium にはあります。',
  'Confirm the policy is actually associated with the firewall handling this traffic.':
    'このトラフィックを処理しているファイアウォールに、ポリシーが実際に関連付けられていることを確認してください。',
  'Confirm the public IP matches the on-premises device address seen from the internet after NAT.':
    'パブリック IP が、NAT 後にインターネットから見えるオンプレミスデバイスのアドレスと一致していることを確認してください。',
  'Confirm the pulling identity has the AcrPull role.':
    'イメージを取得する ID に AcrPull ロールが割り当てられていることを確認してください。',
  'Confirm the server firewall rules or Private Endpoint permit the client.':
    'サーバーのファイアウォール規則または Private Endpoint がクライアントを許可していることを確認してください。',
  'Confirm the subnet has enough free addresses for the maximum pods per node under Azure CNI.':
    'Azure CNI を使用する場合、ノードあたりの最大 Pod 数に対して十分な空きアドレスがサブネットにあることを確認してください。',
  'Confirm the subnet is large enough — Azure reserves 5 addresses in every subnet.':
    'サブネットのサイズが十分であることを確認してください。Azure はすべてのサブネットで 5 個のアドレスを予約します。',
  'Confirm the tunnel is Connected, not just Provisioned.':
    'トンネルが Provisioned だけでなく Connected 状態になっていることを確認してください。',
  'Confirm the upgrade policy is not mid-rollout when investigating inconsistent behaviour.':
    '動作が一貫しない場合は、アップグレードポリシーによる展開が進行中でないことを確認してください。',
  'Confirm what the client actually resolves the name to — a wrong DNS answer sends traffic to the wrong place.':
    'クライアントが実際にその名前を何に解決しているかを確認してください。DNS の応答が誤っていると、トラフィックは誤った宛先へ送られます。',
  'Confirm whether the policy is in Detection or Prevention mode before concluding it is not the cause.':
    '原因ではないと判断する前に、ポリシーが検出モードか防止モードかを確認してください。',
  'Consumers create a Private Endpoint that requests a connection; you approve it. Traffic arrives with the source NAT applied by the platform.':
    'コンシューマーは接続を要求する Private Endpoint を作成し、提供側がそれを承認します。トラフィックはプラットフォームによる送信元 NAT が適用された状態で到着します。',
  'Container Instances runs a single container without any cluster to manage.':
    'Container Instances は、管理すべきクラスターなしで単一のコンテナーを実行します。',
  'Cosmos DB is a globally distributed NoSQL database with low-latency reads and writes.':
    'Cosmos DB は、低遅延の読み書きを実現するグローバル分散型の NoSQL データベースです。',
  'Cross-subscription peering and Private Link need permissions in BOTH subscriptions.':
    'サブスクリプションをまたぐピアリングと Private Link には、両方のサブスクリプションでの権限が必要です。',
  'Customers use one when they need a specific vendor feature set, or want the same appliance on-premises and in Azure.':
    '特定ベンダーの機能セットが必要な場合や、オンプレミスと Azure で同じアプライアンスを使いたい場合に採用されます。',
  'DNS Private Resolver is a managed service that resolves DNS between on-premises and Azure without you running DNS server VMs.':
    'DNS Private Resolver は、DNS サーバー VM を運用せずにオンプレミスと Azure の間で DNS 解決を行うマネージドサービスです。',
  'DNS is the number-one cause of failure — run a lookup from the client and confirm it returns the private IP, not the public one.':
    'DNS は障害原因の第 1 位です。クライアントから名前解決を実行し、パブリック IP ではなくプライベート IP が返ることを確認してください。',
  'Direct mode needs TCP 10250-10255 and 10000-20000 open; gateway mode only needs 443.':
    'ダイレクトモードでは TCP 10250-10255 および 10000-20000 の開放が必要です。ゲートウェイモードでは 443 のみで済みます。',
  'Each sub-resource needs its OWN Private Endpoint and its own privatelink DNS zone.':
    'サブリソースごとに、それぞれ専用の Private Endpoint と privatelink DNS ゾーンが必要です。',
  'Effective routes and effective security rules are both read from the NIC — always start here.':
    '有効なルートと有効なセキュリティ規則は、どちらも NIC から確認します。まずはここから始めてください。',
  'Enable VNet flow logs for a historical record of allow and deny decisions.':
    '許可・拒否の判定履歴を残すため、VNet フローログを有効にしてください。',
  'Every traffic flow needs an origin — this is the person or application whose experience you are troubleshooting.':
    'すべてのトラフィックフローには起点が必要です。ここはトラブルシューティング対象となる利用者やアプリケーションを表します。',
  'Everything drawn inside this boundary is deployed in the same region, so traffic between those resources stays on the regional network rather than crossing the internet.':
    'この境界の内側に描かれているものはすべて同じリージョンにデプロイされているため、リソース間のトラフィックはインターネットを経由せず、リージョン内のネットワークにとどまります。',
  'Firewall Policy is the reusable rule container that one or more Azure Firewalls apply.':
    'Firewall Policy は、1 つ以上の Azure Firewall が適用する、再利用可能なルールのコンテナーです。',
  'For Private Endpoints, the zone name must match the required pattern exactly (for example privatelink.blob.core.windows.net).':
    'Private Endpoint では、ゾーン名が所定のパターンと完全に一致している必要があります (例: privatelink.blob.core.windows.net)。',
  'For Standard SKU, remember inbound is closed by default until an NSG rule opens it.':
    'Standard SKU では、NSG 規則で開放するまで受信が既定で閉じられている点に注意してください。',
  'For TLS errors, check certificate expiry, chain, and whether the backend hostname matches the certificate.':
    'TLS エラーの場合は、証明書の有効期限、チェーン、およびバックエンドのホスト名が証明書と一致しているかを確認してください。',
  'For an internal load balancer, confirm the client is on a network that can reach the private front-end IP.':
    '内部ロードバランサーの場合は、クライアントがプライベートなフロントエンド IP に到達できるネットワークにいることを確認してください。',
  'For inbound: confirm the public IP, the NSG allow rule, and the health of the backend.':
    '受信の場合は、パブリック IP、NSG の許可規則、およびバックエンドの正常性を確認してください。',
  'For outbound VNet integration, WEBSITE_DNS_SERVER and route-all settings decide whether traffic uses VNet DNS and routes.':
    '送信方向の VNet 統合では、WEBSITE_DNS_SERVER と route-all の設定によって、トラフィックが VNet の DNS とルートを使用するかどうかが決まります。',
  'For outbound: confirm an explicit method exists — a NAT Gateway, a load balancer outbound rule, or a public IP on the NIC. Default outbound access was retired on 30 September 2025, so a new VM without one of these has no internet access at all.': 'アウトバウンドについては、NAT Gateway、ロード バランサーの送信規則、または NIC のパブリック IP のいずれか明示的な方法があることを確認してください。既定の送信アクセスは 2025 年 9 月 30 日に廃止されたため、いずれも構成されていない新しい VM はインターネットにまったく接続できません。',
  'Front Door is a global Layer-7 entry point with content delivery and WAF built in.':
    'Front Door は、コンテンツ配信と WAF を内蔵したグローバルなレイヤー 7 のエントリポイントです。',
  'Gateway, Firewall, and Bastion subnets must use their exact reserved names or deployment fails.':
    'Gateway、Firewall、Bastion の各サブネットは、予約された名前を正確に使用する必要があります。そうでないとデプロイが失敗します。',
  'Hybrid flows depend on it, and it is frequently the piece nobody has console access to during a call.':
    'ハイブリッド構成の通信はここに依存しますが、通話中に誰もコンソールにアクセスできない箇所であることがよくあります。',
  'IKE phase 1/2 settings, PSK, and the IPsec policy must match EXACTLY on both ends.':
    'IKE のフェーズ 1/2 設定、事前共有キー、IPsec ポリシーは、両端で完全に一致している必要があります。',
  'IP forwarding must be enabled on the NVA NIC in Azure AND inside the guest OS.':
    'IP 転送は、Azure 側の NVA の NIC とゲスト OS の内部の両方で有効にする必要があります。',
  'If the account firewall is set to selected networks, confirm the caller subnet or IP is listed.':
    'アカウントのファイアウォールが選択したネットワークに限定されている場合は、呼び出し元のサブネットまたは IP が登録されていることを確認してください。',
  'If the firewall is restricted, confirm the caller network or the trusted-services exception is allowed.':
    'ファイアウォールで制限している場合は、呼び出し元のネットワーク、または信頼されたサービスの例外が許可されていることを確認してください。',
  'Inbound and outbound are configured independently — confirm which direction is failing.':
    '受信と送信は個別に構成されます。どちらの方向が失敗しているかを確認してください。',
  'Inbound and outbound endpoints each need their own delegated subnet.':
    '受信エンドポイントと送信エンドポイントには、それぞれ専用の委任済みサブネットが必要です。',
  'Inbound internet traffic lands on a public IP attached to a gateway, load balancer, or VM. Outbound traffic leaves through a NAT Gateway, a load balancer, or a firewall.':
    'インターネットからの受信トラフィックは、ゲートウェイ、ロードバランサー、または VM に割り当てられたパブリック IP に着信します。送信トラフィックは NAT Gateway、ロードバランサー、またはファイアウォール経由で出ていきます。',
  'Inbound private access uses a Private Endpoint. Outbound access into a VNet uses regional VNet integration — the two are separate features.':
    '受信方向のプライベートアクセスには Private Endpoint を使用します。VNet への送信アクセスにはリージョナル VNet 統合を使用します。この 2 つは別々の機能です。',
  'Individual public IPs are then allocated from the prefix and assigned to resources such as a NAT Gateway or load balancer.':
    '個々のパブリック IP はそのプレフィックスから割り当てられ、NAT Gateway やロードバランサーなどのリソースに設定されます。',
  'Instances share one network configuration and normally sit in a load balancer or Application Gateway backend pool.':
    'インスタンスは 1 つのネットワーク構成を共有し、通常はロードバランサーまたは Application Gateway のバックエンドプールに配置されます。',
  'It answers "is this being blocked, and by what?" with data instead of guesswork.':
    '「これはブロックされているのか、何によってか」という問いに、推測ではなくデータで答えます。',
  'It attaches to Application Gateway or Front Door and runs in Detection mode (log only) or Prevention mode (block).':
    'Application Gateway または Front Door に関連付けられ、検出モード (ログのみ) または防止モード (ブロック) で動作します。',
  'It attaches to a subnet, a NIC, or both. Rules are evaluated by priority, lowest number first, and the first match wins. Because it is stateful, return traffic for an allowed flow is permitted automatically.':
    'サブネット、NIC、またはその両方に関連付けられます。規則は優先度の小さい順に評価され、最初に一致したものが適用されます。ステートフルであるため、許可されたフローの戻りトラフィックは自動的に許可されます。',
  'It attaches to a subnet. Azure picks the most specific matching prefix; if two routes tie, a UDR beats a BGP route, which beats a system route.':
    'サブネットに関連付けられます。Azure は最も限定的に一致するプレフィックスを選択し、同じ長さで競合した場合は UDR が BGP ルートより優先され、BGP ルートがシステムルートより優先されます。',
  'It attaches to one or more subnets. Once attached, it takes priority over all other outbound methods for those subnets. It never allows unsolicited inbound traffic.':
    '1 つ以上のサブネットに関連付けられます。関連付けられると、そのサブネットにおいて他のすべての送信方法より優先されます。要求していない受信トラフィックを許可することはありません。',
  'It avoids the public internet entirely, giving predictable latency, higher bandwidth, and an SLA.':
    'パブリックインターネットを完全に回避するため、予測可能な遅延、より高い帯域幅、および SLA が得られます。',
  'It blocks application-layer attacks that a Layer-4 firewall or NSG cannot see, because those only look at IP and port.':
    'レイヤー 4 のファイアウォールや NSG は IP とポートしか見ないため検出できない、アプリケーション層の攻撃をブロックします。',
  'It can be deployed into a VNet subnet for private access, or given a public IP for direct access.':
    'プライベートアクセス用に VNet のサブネットへデプロイすることも、直接アクセス用にパブリック IP を付与することもできます。',
  'It can be external (public front end) or internal (VNet-only). In VNet mode it has strict required NSG rules and dependency endpoints.':
    '外部 (パブリックなフロントエンド) と内部 (VNet 内のみ) のどちらでも構成できます。VNet モードでは、必須の NSG 規則と依存エンドポイントが厳密に定められています。',
  'It can be reached publicly, or privately through a Private Endpoint with the matching Private DNS Zone.':
    'パブリックにアクセスすることも、対応するプライベート DNS ゾーンを備えた Private Endpoint 経由でプライベートにアクセスすることもできます。',
  'It cannot be used for inbound; if inbound is needed, that is a separate load balancer or public IP.':
    '受信には使用できません。受信が必要な場合は、別途ロードバランサーまたはパブリック IP が必要です。',
  'It carries the shared key, the IPsec/IKE policy, and the BGP setting for that specific link.':
    'そのリンク固有の事前共有キー、IPsec/IKE ポリシー、および BGP 設定を保持します。',
  'It centralises egress control and logging, so one policy governs what an entire hub-and-spoke estate is allowed to reach.':
    '送信制御とログを一元化するため、1 つのポリシーでハブアンドスポーク環境全体のアクセス先を管理できます。',
  'It clarifies who experiences the behaviour being described.': '説明されている事象を、誰が体験しているのかを明確にします。',
  'It connects from the office LAN, from home, or through a VPN client, and each path resolves DNS differently.':
    'オフィスの LAN、自宅、または VPN クライアント経由で接続し、それぞれの経路で DNS の解決結果が異なります。',
  'It connects over the public internet unless a VPN profile is applied.':
    'VPN プロファイルが適用されていない限り、パブリックインターネット経由で接続します。',
  'It connects to Azure through a Site-to-Site VPN tunnel or an ExpressRoute circuit. Routes are exchanged either statically or via BGP.':
    'サイト間 VPN トンネルまたは ExpressRoute 回線を通じて Azure に接続します。経路は静的または BGP で交換されます。',
  'It connects to a subnet through a NIC. Its reachability is governed by the NSG on that NIC and on the subnet, plus the guest OS firewall.':
    'NIC を介してサブネットに接続します。到達性は、その NIC とサブネットの NSG、およびゲスト OS のファイアウォールによって決まります。',
  'It gives container workloads scheduling, self-healing, and scaling without you operating Kubernetes masters.':
    'Kubernetes のマスターを運用せずに、コンテナーワークロードのスケジューリング、自己修復、スケーリングを実現します。',
  'It gives one consistent front door for many backends, with authentication, rate limiting, and transformation applied by policy.':
    '多数のバックエンドに対して一貫した入口を提供し、認証、レート制限、変換をポリシーで適用します。',
  'It gives you a predictable, unchanging range so partners and firewalls can allow-list your egress addresses once.':
    '予測可能で変化しない範囲が得られるため、パートナーやファイアウォール側で送信元アドレスを一度だけ許可リストに登録すれば済みます。',
  'It gives you a stable, known egress address and a very large pool of SNAT ports, which prevents the port-exhaustion failures common with default outbound access.':
    '安定した既知の送信元アドレスと非常に大きな SNAT ポートのプールが得られるため、既定の送信アクセスでよく起きるポート枯渇の障害を防げます。',
  'It gives you private connectivity into the VNet over the public internet, without exposing resources publicly.':
    'リソースをパブリックに公開することなく、パブリックインターネット経由で VNet へのプライベートな接続を提供します。',
  'It gives your resources private IP addresses and a security boundary, so they can talk to each other privately instead of over the public internet.':
    'リソースにプライベート IP アドレスとセキュリティ境界を提供するため、パブリックインターネットではなくプライベートに相互通信できます。',
  'It groups resources with a shared lifecycle so they can be deployed, permissioned, and deleted together.':
    'ライフサイクルを共有するリソースをまとめ、デプロイ、権限付与、削除を一括で行えるようにします。',
  'It handles scale and instance repair for you, so capacity follows demand without manual VM creation.':
    'スケーリングとインスタンスの修復を自動で行うため、VM を手動で作成しなくても需要に応じて容量が追随します。',
  'It injects the routes learned from on-premises into the VNet and forwards traffic onto the private circuit.':
    'オンプレミスから学習した経路を VNet に注入し、トラフィックをプライベート回線へ転送します。',
  'It is deployed into a dedicated AzureBastionSubnet. The admin connects to the Azure portal over TLS, and Bastion opens the RDP or SSH session to the VM private IP.':
    '専用の AzureBastionSubnet にデプロイされます。管理者は TLS で Azure portal に接続し、Bastion が VM のプライベート IP に対して RDP または SSH セッションを確立します。',
  'It is enabled per region. IP flow verify names the exact NSG rule that allowed or denied a flow; next hop shows where a packet would actually be routed.':
    'リージョンごとに有効化します。IP フロー検証はフローを許可または拒否した NSG 規則を特定し、ネクストホップはパケットが実際にどこへルーティングされるかを示します。',
  'It is reached over HTTPS. It can be locked down with firewall rules or a Private Endpoint, and callers usually authenticate with a managed identity.':
    'HTTPS でアクセスします。ファイアウォール規則や Private Endpoint で保護でき、呼び出し元は通常マネージド ID で認証します。',
  'It is reached over TCP 1433. The connection policy is Redirect (which also needs ports 11000-11999) or Proxy (1433 only).':
    'TCP 1433 でアクセスします。接続ポリシーは Redirect (ポート 11000-11999 も必要) または Proxy (1433 のみ) です。',
  'It is referenced by a Connection resource, which pairs it with the Azure VPN Gateway. With BGP, the prefix list is learned dynamically instead.':
    'Connection リソースから参照され、Azure の VPN Gateway と対応付けられます。BGP を使う場合、プレフィックスの一覧は動的に学習されます。',
  'It is the basic segmentation control in Azure, but it does not deny by default: the built-in AllowVNetInBound rule already permits all traffic inside the virtual network, so segmentation starts only when you add your own higher-priority deny.': 'Azure における基本的なセグメンテーション制御ですが、既定で拒否するわけではありません。組み込みの AllowVNetInBound ルールが仮想ネットワーク内のすべての通信を既に許可しているため、セグメンテーションは独自の優先度の高い拒否ルールを追加して初めて機能します。',
  'It is the control plane. Control-plane and data-plane failures look similar to users but have different causes.':
    'これはコントロールプレーンです。コントロールプレーンとデータプレーンの障害は利用者には似て見えますが、原因は異なります。',
  'It is the destination doing the actual work — serving the page, running the query, hosting the application.':
    '実際の処理を行う宛先です。ページの配信、クエリの実行、アプリケーションのホストなどを担当します。',
  'It is the general-purpose durable store that most workloads read from and write to.':
    'ほとんどのワークロードが読み書きする、汎用的で永続的なストレージです。',
  'It is the most common place a reported issue is actually observed.':
    '報告された問題が実際に観測される、最も一般的な場所です。',
  'It is what makes a resource reachable from the internet, and it identifies your traffic when it leaves Azure.':
    'リソースをインターネットから到達可能にするものであり、トラフィックが Azure から出ていく際の識別子にもなります。',
  'It is where a VM gets its IP configuration, and it is the most precise place to attach an NSG or check what rules and routes actually apply.':
    'VM が IP 構成を取得する場所であり、NSG を関連付けたり、実際に適用される規則と経路を確認したりするうえで最も正確な場所です。',
  'It keeps credentials out of code and configuration, and gives you an audit trail of who read what.':
    '資格情報をコードや構成から切り離し、誰が何を読み取ったかの監査証跡を提供します。',
  'It keeps firewall rules readable and lets you update one object instead of editing many rules.':
    'ファイアウォール規則を読みやすく保ち、多数の規則を編集する代わりに 1 つのオブジェクトを更新するだけで済みます。',
  'It keeps rules meaningful as the environment scales — "web can reach app" survives every IP change.':
    '環境が拡大しても規則の意味が保たれます。「web は app に到達できる」という表現は、IP の変更があっても有効なままです。',
  'It lets AKS workloads use Gateway API and Ingress objects to publish services without hand-managing gateway configuration.':
    'AKS のワークロードが Gateway API や Ingress オブジェクトを使ってサービスを公開できるようになり、ゲートウェイ構成を手作業で管理する必要がなくなります。',
  'It lets you offer a service to customers or other business units without peering networks or exposing anything publicly.':
    'ネットワークをピアリングしたり何かをパブリックに公開したりせずに、顧客や他部門にサービスを提供できます。',
  'It lets you reach a PaaS service such as Storage or SQL over a private IP on the Microsoft backbone, so the public endpoint can be disabled entirely.':
    'Storage や SQL などの PaaS サービスに、Microsoft バックボーン上のプライベート IP でアクセスできるため、パブリックエンドポイントを完全に無効化できます。',
  'It lets you write rules once and inherit them across firewalls, with a parent policy for organisation-wide rules and child policies per environment.':
    '規則を一度作成すれば複数のファイアウォールで継承でき、組織全体の規則を親ポリシーに、環境ごとの規則を子ポリシーに置けます。',
  'It lives in the reserved GatewaySubnet and pairs with a Local Network Gateway (the remote device) through a Connection resource. Routes are static or learned via BGP.':
    '予約された GatewaySubnet に配置され、Connection リソースを介して Local Network Gateway (リモート側デバイス) と対応付けられます。経路は静的、または BGP で学習されます。',
  'It marks where the user-visible experience begins, which is the perspective the customer is reporting from.':
    'ユーザーが体験する起点を示します。これは、お客様が報告している視点そのものです。',
  'It never sees your traffic. It only returns a CNAME or IP in a DNS answer, so the client connects directly to the chosen endpoint afterwards.':
    '実際のトラフィックは通過しません。DNS 応答として CNAME または IP を返すだけで、その後クライアントは選ばれたエンドポイントに直接接続します。',
  'It only works if DNS resolves the service hostname to the private IP. That is normally done with a Private DNS Zone linked to the VNet.':
    'DNS がサービスのホスト名をプライベート IP に解決する場合にのみ機能します。通常は VNet にリンクしたプライベート DNS ゾーンで実現します。',
  'It provides a SQL Server-compatible database without you patching, backing up, or clustering servers.':
    'サーバーのパッチ適用、バックアップ、クラスタリングを行わずに、SQL Server 互換のデータベースを提供します。',
  'It provides high availability and scale — if one backend instance fails its health probe, new connections stop going to it.':
    '高可用性とスケールを提供します。あるバックエンドインスタンスが正常性プローブに失敗すると、新規接続はそのインスタンスへ送られなくなります。',
  'It provides transit routing between everything attached to it, without you having to build gateway chaining or route tables by hand.':
    'ゲートウェイの連鎖やルートテーブルを手作業で構築しなくても、接続されたすべての要素間でトランジットルーティングを提供します。',
  'It reaches Azure APIs over HTTPS, or reaches workloads directly over SSH, RDP, or an application port.':
    'HTTPS で Azure の API にアクセスするか、SSH、RDP、アプリケーションのポートで直接ワークロードにアクセスします。',
  'It reaches Azure across a VPN tunnel or ExpressRoute circuit, or over the public internet.':
    'VPN トンネル、ExpressRoute 回線、またはパブリックインターネット経由で Azure にアクセスします。',
  'It removes OS patching and scaling work, so teams ship application code instead of infrastructure.':
    'OS のパッチ適用やスケーリングの作業をなくし、チームはインフラではなくアプリケーションコードの提供に集中できます。',
  'It removes the need to give VMs public IPs or open 3389/22 to the internet, which is one of the most exploited misconfigurations.':
    'VM にパブリック IP を付与したり、3389/22 をインターネットに開放したりする必要がなくなります。これは最も悪用されやすい設定ミスの 1 つです。',
  'It removes the work of building and maintaining your own hubs, route tables, and gateway meshes across many regions and branches.':
    '多数のリージョンや拠点にまたがるハブ、ルートテーブル、ゲートウェイのメッシュを自前で構築・維持する作業をなくします。',
  'It represents scripted or interactive commands, which are often where the reproduction steps live.':
    'スクリプトや対話的なコマンドを表します。再現手順は多くの場合ここに含まれます。',
  'It resolves the target name through DNS and then connects to the returned address.':
    'DNS で対象の名前を解決し、返されたアドレスに接続します。',
  'It routes by URL path and hostname, terminates TLS so certificates live in one place, and can run a Web Application Firewall in front of your app.':
    'URL パスとホスト名でルーティングし、TLS を終端して証明書を 1 か所に集約でき、アプリの前段で Web Application Firewall を動作させることもできます。',
  'It separates billing, applies quota limits, and acts as a scope for role assignments and policy.':
    '課金を分離し、クォータの上限を適用し、ロール割り当てやポリシーのスコープとして機能します。',
  'It shares the App Service networking model — Private Endpoint for inbound, VNet integration for outbound. The hosting plan decides what is available: Flex Consumption and Premium both support VNet integration, the classic Consumption plan does not.': 'App Service と同じネットワーク モデルを使用します。受信は Private Endpoint、送信は VNet 統合です。利用できる機能はホスティング プランで決まり、Flex Consumption と Premium はどちらも VNet 統合をサポートしますが、従来の Consumption プランはサポートしません。',
  'It sits in the GatewaySubnet and is linked to a circuit through a connection. Route exchange is always via BGP.':
    'GatewaySubnet に配置され、接続を介して回線とリンクされます。経路交換は常に BGP で行われます。',
  'It steers users to the closest or highest-priority region and removes failed regions from DNS answers.':
    'ユーザーを最も近い、または優先度の高いリージョンへ誘導し、障害が発生したリージョンを DNS 応答から除外します。',
  'It suits glue logic and triggers where running a full application host would be wasteful.':
    'アプリケーションホストをまるごと動かすのが無駄になるような、連携処理やトリガーに適しています。',
  'It suits short-lived or bursty jobs where a full Kubernetes cluster would be overkill.':
    'Kubernetes クラスター全体を用意するのは過剰となる、短時間またはバースト的なジョブに適しています。',
  'It suits workloads that need multi-region replication and predictable latency at scale.':
    '複数リージョンへのレプリケーションと、大規模環境での予測可能な遅延を必要とするワークロードに適しています。',
  'It terminates the user connection at the nearest Microsoft edge site, which cuts latency, and it fails over between regional backends automatically.':
    'ユーザーの接続を最寄りの Microsoft エッジ拠点で終端して遅延を削減し、リージョンごとのバックエンド間で自動的にフェールオーバーします。',
  'Key Vault stores secrets, keys, and certificates with access controlled by policy or RBAC.':
    'Key Vault は、ポリシーまたは RBAC でアクセスを制御しながら、シークレット、キー、証明書を保管します。',
  'Make sure the return path has an equivalent route, or the flow becomes asymmetric and is dropped by the stateful firewall.':
    '戻りの経路にも同等のルートがあることを確認してください。ない場合、フローが非対称になり、ステートフルなファイアウォールに破棄されます。',
  'Management traffic often takes a completely different path from application traffic and has its own controls.':
    '管理トラフィックは、アプリケーションのトラフィックとはまったく異なる経路をたどり、独自の制御を持つことがよくあります。',
  'Mobile clients frequently arrive over carrier networks or a Point-to-Site VPN, so their path differs from office clients.':
    'モバイルクライアントはキャリア網やポイント対サイト VPN 経由で接続することが多く、オフィスのクライアントとは経路が異なります。',
  'Most enterprise workloads are hybrid, so Azure resources must reach systems that still live on-premises (and vice versa).':
    'ほとんどの企業ワークロードはハイブリッド構成であるため、Azure のリソースはオンプレミスに残るシステムに到達できる必要があり、その逆も同様です。',
  'NAT Gateway is zonal — confirm the zone matches the workload for zone-resilient designs.':
    'NAT Gateway はゾーン単位のリソースです。ゾーン冗長構成では、ゾーンがワークロードと一致していることを確認してください。',
  'NAT Gateway provides outbound-only internet connectivity for a subnet, using dedicated public IPs.':
    'NAT Gateway は、専用のパブリック IP を使用して、サブネットに送信専用のインターネット接続を提供します。',
  'NSGs and UDRs affect a Private Endpoint only when the subnet has PrivateEndpointNetworkPolicies enabled — it is disabled by default, so a rule you expect to match may never be evaluated at all.': 'NSG と UDR が Private Endpoint に適用されるのは、サブネットで PrivateEndpointNetworkPolicies が有効な場合だけです。既定では無効なため、一致するはずのルールがそもそも評価されていないことがあります。',
  'Native client and IP-based connection require the Standard or Premium SKU.':
    'ネイティブクライアント接続と IP ベースの接続には、Standard または Premium SKU が必要です。',
  'Network Watcher is the diagnostics toolbox for Azure networking — connection troubleshoot, IP flow verify, next hop, packet capture, and flow logs.':
    'Network Watcher は Azure ネットワークの診断ツール群です。接続のトラブルシューティング、IP フロー検証、ネクストホップ、パケットキャプチャ、フローログを提供します。',
  'Azure CNI is the current plugin and the IP mode is what matters. In node-subnet or pod-subnet mode every pod gets a real VNet IP, so pod addresses must be planned into the subnet size; CNI Overlay instead puts pods on a separate overlay range and consumes far fewer VNet IPs. Legacy kubenet is retiring on 31 March 2028.': '現在のプラグインは Azure CNI で、重要なのは IP モードです。node-subnet または pod-subnet モードではすべての Pod が実際の VNet IP を取得するため、Pod のアドレスをサブネット サイズに織り込んで設計する必要があります。一方 CNI Overlay は Pod を別のオーバーレイ範囲に配置するため、消費する VNet IP がはるかに少なくなります。従来の kubenet は 2028 年 3 月 31 日に廃止されます。',
  'Nothing reaches the right destination if the name resolves to the wrong address — DNS is the first hop of almost every flow.':
    '名前が誤ったアドレスに解決されると、何も正しい宛先には届きません。DNS はほぼすべてのフローにおける最初のホップです。',
  'On-premises clients cannot query Azure Private DNS Zones directly, and Azure clients often need to resolve on-premises names. The resolver bridges both directions.':
    'オンプレミスのクライアントは Azure のプライベート DNS ゾーンに直接問い合わせできず、Azure 側のクライアントはオンプレミスの名前を解決する必要がしばしばあります。リゾルバーは双方向を橋渡しします。',
  'One VM can have multiple NICs, and each NIC can hold multiple IP configurations. Accelerated Networking is enabled per NIC.':
    '1 台の VM は複数の NIC を持つことができ、各 NIC は複数の IP 構成を保持できます。高速ネットワークは NIC 単位で有効化します。',
  'Outbound type (load balancer, NAT Gateway, or userDefinedRouting) determines the egress path.':
    '送信の種類 (ロードバランサー、NAT Gateway、userDefinedRouting) によって、送信経路が決まります。',
  'Over Private Link, confirm the privatelink.vaultcore.azure.net zone is linked to the VNet.':
    'Private Link 経由の場合は、privatelink.vaultcore.azure.net ゾーンが VNet にリンクされていることを確認してください。',
  'Over Private Link, verify the name resolves to the private IP.':
    'Private Link 経由の場合は、名前がプライベート IP に解決されることを確認してください。',
  'Portal actions call Azure Resource Manager over HTTPS; they do not traverse your VNet.':
    'ポータルでの操作は HTTPS で Azure Resource Manager を呼び出すもので、お客様の VNet を経由しません。',
  'Private Endpoint requires a DNS record for every region the account is replicated to.':
    'Private Endpoint では、アカウントがレプリケートされているすべてのリージョンについて DNS レコードが必要です。',
  'Private Link Service publishes your own service, sitting behind a Standard internal load balancer, so other VNets can consume it via a Private Endpoint.':
    'Private Link Service は、Standard の内部ロードバランサーの背後にある自社サービスを公開し、他の VNet が Private Endpoint 経由で利用できるようにします。',
  'Public-facing workloads must be reachable from the internet, and most workloads need outbound internet access for updates and API calls.':
    '外部公開のワークロードはインターネットから到達可能である必要があり、ほとんどのワークロードは更新プログラムの取得や API 呼び出しのために送信方向のインターネットアクセスを必要とします。',
  'Real environments contain third-party appliances, SaaS endpoints, and legacy systems that still shape the traffic path.':
    '実環境には、サードパーティのアプライアンス、SaaS のエンドポイント、レガシーシステムが存在し、それらがトラフィック経路を左右します。',
  'Redirect policy requires 11000-11999 outbound to be open — this is a very common firewall oversight.':
    'Redirect ポリシーでは送信方向で 11000-11999 の開放が必要です。これはファイアウォール設定で非常によく見落とされる点です。',
  'Region choice controls latency to your users, data-residency compliance, and which services and SKUs are even available.':
    'リージョンの選択は、ユーザーまでの遅延、データ所在地に関するコンプライアンス、そして利用できるサービスや SKU そのものを左右します。',
  'Remember inbound is evaluated subnet-first then NIC; outbound is NIC-first then subnet.':
    '受信はサブネット、次に NIC の順で評価され、送信は NIC、次にサブネットの順で評価される点に注意してください。',
  'Resource group membership never blocks traffic — if something is unreachable, look at NSG, UDR, DNS, or peering instead.':
    'リソースグループの所属がトラフィックを遮断することはありません。到達できない場合は、NSG、UDR、DNS、またはピアリングを確認してください。',
  'Resources are placed in subnets inside the VNet. Everything in the same VNet can reach everything else by default; reaching another VNet requires peering, a gateway, or Private Link.':
    'リソースは VNet 内のサブネットに配置されます。同じ VNet 内のリソースは既定で相互に到達できますが、別の VNet に到達するにはピアリング、ゲートウェイ、または Private Link が必要です。',
  'Resources in different subscriptions can still be peered and connected, but quota, policy, and RBAC are evaluated per subscription.':
    '異なるサブスクリプションのリソースもピアリングや接続が可能ですが、クォータ、ポリシー、RBAC はサブスクリプションごとに評価されます。',
  'Rule collection groups are evaluated by priority, and inherited parent rules always run before child rules.':
    'ルールコレクショングループは優先度順に評価され、継承された親の規則は常に子の規則より先に適用されます。',
  'Run IP flow verify for the failing 5-tuple — it names the deciding rule directly.':
    '失敗している 5 タプルについて IP フロー検証を実行してください。判定を下した規則が直接特定できます。',
  'Run next hop from the source NIC to confirm the routing decision.':
    '送信元 NIC からネクストホップを実行し、ルーティングの判定結果を確認してください。',
  'Secured hub (Routing Intent) changes the path — confirm whether traffic is being sent to Azure Firewall.':
    'セキュリティ保護されたハブ (ルーティング インテント) は経路を変更します。トラフィックが Azure Firewall に送られていないか確認してください。',
  'Service tags change over time; prefer them over hard-coded IP ranges.':
    'サービスタグの内容は時間とともに変化します。ハードコードした IP 範囲よりサービスタグの使用を推奨します。',
  'Standard SKU addresses are static and secure-by-default — inbound is denied unless an NSG allows it. Basic SKU is retired.':
    'Standard SKU のアドレスは静的で既定で安全です。NSG が許可しない限り受信は拒否されます。Basic SKU は提供終了しています。',
  'Subnets let you segment a VNet so different tiers (web, app, data) can be secured and routed independently.':
    'サブネットにより VNet を分割でき、階層 (web、app、data) ごとに独立したセキュリティとルーティングを適用できます。',
  'Test on and off the corporate network — a split-tunnel VPN policy often explains "works for some users".':
    '社内ネットワークの内外の両方でテストしてください。「一部のユーザーだけ成功する」現象は、スプリットトンネルの VPN ポリシーが原因であることがよくあります。',
  'The ALB controller in the cluster watches Kubernetes objects and programs the gateway, forwarding HTTP/HTTPS traffic straight to pod endpoints.':
    'クラスター内の ALB コントローラーが Kubernetes のオブジェクトを監視してゲートウェイを構成し、HTTP/HTTPS トラフィックを Pod のエンドポイントへ直接転送します。',
  'The Azure portal — the browser-based management plane at portal.azure.com.':
    'Azure portal です。portal.azure.com のブラウザーベースの管理プレーンを指します。',
  'The NAT subnet must have enough free IP addresses for the number of connections.':
    'NAT 用サブネットには、接続数に見合った十分な空き IP アドレスが必要です。',
  'The SDK can use direct mode, which opens additional TCP ports beyond 443, or gateway mode which uses 443 only.':
    'SDK は、443 以外の TCP ポートも使用するダイレクトモードか、443 のみを使用するゲートウェイモードのいずれかを利用できます。',
  'The backend must be behind a Standard SKU internal load balancer — Basic is not supported.':
    'バックエンドは Standard SKU の内部ロードバランサーの背後に配置する必要があります。Basic はサポートされません。',
  'The circuit carries one or more peerings. Private peering reaches your VNets; Microsoft peering reaches Microsoft public services such as Microsoft 365.':
    '回線は 1 つ以上のピアリングを持ちます。プライベートピアリングはお客様の VNet に、Microsoft ピアリングは Microsoft 365 などの Microsoft パブリックサービスに到達します。',
  'The client resolves a name through DNS, then connects to whatever public or private IP that name returns.':
    'クライアントは DNS で名前を解決し、その名前が返すパブリックまたはプライベート IP に接続します。',
  'The end user or client device that starts the request.': 'リクエストを開始するエンドユーザーまたはクライアントデバイスです。',
  'The function needs reachable storage; a blocked storage account stops the function starting at all.':
    '関数には到達可能なストレージが必要です。ストレージアカウントがブロックされていると、関数はそもそも起動しません。',
  'The gateway alone does nothing; the connection is what actually establishes and holds the tunnel or circuit link.':
    'ゲートウェイだけでは何も起きません。トンネルや回線リンクを実際に確立し維持するのは接続 (Connection) です。',
  'The guest OS firewall is a separate layer from the NSG — Windows Firewall or iptables can block traffic the NSG allowed.':
    'ゲスト OS のファイアウォールは NSG とは別の層です。NSG が許可した通信を Windows ファイアウォールや iptables がブロックすることがあります。',
  'The plan is associated with a VNet, and every public IP in that VNet is then protected.':
    'プランは VNet に関連付けられ、その VNet 内のすべてのパブリック IP が保護対象になります。',
  'The public internet — traffic arriving from, or leaving to, addresses outside your network.':
    'パブリックインターネットです。自社ネットワーク外のアドレスから届く、またはそこへ出ていくトラフィックを指します。',
  'The subnet must be named exactly AzureBastionSubnet and be /26 or larger.':
    'サブネット名は正確に AzureBastionSubnet とし、サイズは /26 以上である必要があります。',
  'The target VM NSG must allow inbound 3389/22 FROM the Bastion subnet.':
    '対象 VM の NSG は、Bastion サブネットからの 3389/22 の受信を許可する必要があります。',
  'The user resolves your hostname to the closest edge POP. The edge applies WAF and caching rules, then forwards over the Microsoft backbone to the healthiest origin.':
    'ユーザーはホスト名を最寄りのエッジ POP に解決します。エッジは WAF とキャッシュの規則を適用し、Microsoft バックボーン経由で最も正常なオリジンへ転送します。',
  'This represents the customer network outside Azure — a corporate datacenter, branch office, or another cloud.':
    'Azure 外のお客様ネットワークを表します。企業のデータセンター、支社、または別のクラウドを指します。',
  'Traffic Manager is DNS-based global load balancing — it answers DNS queries with the endpoint you should use.':
    'Traffic Manager は DNS ベースのグローバル負荷分散です。DNS クエリに対して、使用すべきエンドポイントを応答します。',
  'Traffic is steered to it with a UDR. For high availability it sits behind an internal load balancer, and its NIC must have IP forwarding enabled.':
    'トラフィックは UDR によってここへ誘導されます。高可用性構成では内部ロードバランサーの背後に配置し、その NIC で IP 転送を有効にする必要があります。',
  'Traffic is steered to it with a User-Defined Route pointing at its private IP. Rules are evaluated in order: DNAT, then network rules, then application rules.':
    'トラフィックは、そのプライベート IP を指すユーザー定義ルートによって誘導されます。規則は DNAT、ネットワーク規則、アプリケーション規則の順に評価されます。',
  'Treat it like any other hop: confirm what it listens on, what it forwards to, and who controls its rules.':
    '他のホップと同様に扱ってください。何をリッスンし、どこへ転送し、誰が規則を管理しているのかを確認します。',
  'Use Effective security rules on the NIC — that shows the merged subnet + NIC result, which is what actually applies.':
    'NIC の「有効なセキュリティ規則」を使用してください。サブネットと NIC を統合した結果が表示され、それが実際に適用される内容です。',
  'Use effective routes on a workload NIC to prove the on-premises prefixes really arrived.':
    'ワークロードの NIC で有効なルートを確認し、オンプレミスのプレフィックスが実際に届いていることを確かめてください。',
  'Used as a generic actor when the exact device does not matter.':
    '具体的なデバイスが重要でない場合に、汎用的な主体として使用します。',
  'VNet connections, VPN sites, and ExpressRoute circuits attach to the hub, and hub route tables control who can reach whom.':
    'VNet 接続、VPN サイト、ExpressRoute 回線がハブに接続され、ハブのルートテーブルがどこからどこへ到達できるかを制御します。',
  'VNet-deployed container groups need a delegated subnet.':
    'VNet にデプロイするコンテナーグループには、委任済みのサブネットが必要です。',
  'VNet-injected APIM requires specific inbound NSG rules; missing them makes the service unhealthy.':
    'VNet に注入した APIM には特定の受信 NSG 規則が必要です。不足するとサービスが異常な状態になります。',
  'Verify the SKU supports the tunnel count and throughput you need.':
    'SKU が必要なトンネル数とスループットに対応していることを確認してください。',
  'Verify the VNet address space does not overlap with any peered VNet or the on-premises network.':
    'VNet のアドレス空間が、ピアリング先の VNet やオンプレミスのネットワークと重複していないことを確認してください。',
  'Verify the downstream party has allow-listed the whole prefix, not one address from it.':
    '接続先の相手が、プレフィックス内の 1 アドレスではなくプレフィックス全体を許可リストに登録していることを確認してください。',
  'Verify the target on-premises DNS server actually answers queries from the Azure source range.':
    '対象のオンプレミス DNS サーバーが、Azure 側の送信元範囲からのクエリに実際に応答することを確認してください。',
  'Verify you have not hit a subscription-level quota (public IPs, VNet peerings, gateway count).':
    'サブスクリプションレベルのクォータ (パブリック IP、VNet ピアリング、ゲートウェイ数) に達していないことを確認してください。',
  'Virtual WAN is a managed networking service that provides a global transit hub-and-spoke backbone.':
    'Virtual WAN は、グローバルなトランジット型ハブアンドスポークのバックボーンを提供するマネージドネットワークサービスです。',
  'Watch for overlapping address space between on-premises and the Azure VNet — that breaks routing.':
    'オンプレミスと Azure VNet の間でアドレス空間が重複していないか注意してください。重複するとルーティングが破綻します。',
  'You assign NICs to the ASG, then reference the ASG as the source or destination in NSG rules.':
    'NIC を ASG に割り当てたうえで、NSG 規則の送信元または宛先としてその ASG を参照します。',
  'You create hubs per region and connect VNets, branches (VPN), and ExpressRoute circuits to them. Microsoft handles the any-to-any routing between hubs.':
    'リージョンごとにハブを作成し、VNet、拠点 (VPN)、ExpressRoute 回線を接続します。ハブ間の any-to-any ルーティングは Microsoft が処理します。',
  'You need it whenever traffic must take a path Azure would not choose on its own — for example forcing all egress through a firewall or NVA.':
    'Azure が自動では選ばない経路をトラフィックに通す必要がある場合に使用します。たとえば、すべての送信をファイアウォールや NVA 経由に強制する場合です。',
  'Zone-redundant vs zonal matters for availability during a zone outage.':
    'ゾーン冗長かゾーン指定かは、ゾーン障害時の可用性に影響します。',
};

const zh: Dict = {
  'A 0.0.0.0/0 route with next hop None or a stale appliance IP blackholes all outbound traffic.':
    '下一跃点为“无”或指向过期设备 IP 的 0.0.0.0/0 路由会将所有出站流量黑洞化。',
  'A 403 is authorisation (RBAC or access policy); a connection timeout is network.':
    '403 属于授权问题（RBAC 或访问策略）；连接超时才是网络问题。',
  'A 403 usually means authorisation or firewall; a name-resolution failure means DNS.':
    '403 通常表示授权或防火墙问题；名称解析失败则表示 DNS 问题。',
  'A Connection is the resource that pairs an Azure gateway with the remote side — a Local Network Gateway, another VNet gateway, or an ExpressRoute circuit.':
    'Connection 是将 Azure 网关与远端（本地网络网关、另一个 VNet 网关或 ExpressRoute 线路）配对的资源。',
  'A DDoS Protection plan adds always-on traffic monitoring and adaptive mitigation for public IPs in protected VNets.':
    'DDoS 防护计划为受保护 VNet 中的公共 IP 提供始终启用的流量监控和自适应缓解。',
  'A DNS zone holds the records that translate names into IP addresses. A Private DNS Zone is only visible to VNets that are linked to it.':
    'DNS 区域保存将名称转换为 IP 地址的记录。专用 DNS 区域仅对与其链接的 VNet 可见。',
  'A Function App runs small pieces of event-driven code, billed by execution.':
    '函数应用运行小段事件驱动的代码，按执行次数计费。',
  'A Local Network Gateway is the Azure object that describes your on-premises VPN device — its public IP and the prefixes behind it.':
    '本地网络网关是描述本地 VPN 设备的 Azure 对象，包含其公共 IP 以及其后的地址前缀。',
  'A NIC is the virtual network adapter that attaches a VM to a subnet and holds its private IP.':
    'NIC 是将虚拟机连接到子网并持有其专用 IP 的虚拟网络适配器。',
  'A Private DNS Zone is linked to one or more VNets. With auto-registration enabled, VMs in a linked VNet register their own records.':
    '专用 DNS 区域链接到一个或多个 VNet。启用自动注册后，已链接 VNet 中的虚拟机会自行注册记录。',
  'A Private Endpoint is a NIC in your subnet that holds a private IP mapped to a specific PaaS resource.':
    '专用终结点是位于你的子网中的 NIC，持有映射到特定 PaaS 资源的专用 IP。',
  'A Public IP Prefix is a contiguous block of public addresses reserved for your subscription.':
    '公共 IP 前缀是为你的订阅保留的一段连续公共地址。',
  'A Public IP is an internet-routable address assigned to a gateway, load balancer, firewall, or VM NIC.':
    '公共 IP 是分配给网关、负载均衡器、防火墙或虚拟机 NIC 的、可在 Internet 上路由的地址。',
  'A Scale Set manages an identical group of VMs that grows and shrinks automatically.':
    '规模集管理一组配置相同、可自动扩缩的虚拟机。',
  'A Storage Account holds blobs, files, queues, and tables behind a public hostname per service.':
    '存储帐户在每个服务各自的公共主机名后保存 blob、文件、队列和表。',
  'A VPN Gateway terminates encrypted IPsec/IKE tunnels between Azure and an on-premises device or remote user.':
    'VPN 网关终结 Azure 与本地设备或远程用户之间的加密 IPsec/IKE 隧道。',
  'A Virtual Machine is a server you run in Azure, with its own operating system and applications.':
    '虚拟机是你在 Azure 中运行的服务器，拥有自己的操作系统和应用程序。',
  'A Virtual Network is your private, isolated network in Azure, defined by one or more address ranges (CIDR blocks).':
    '虚拟网络是你在 Azure 中的专用隔离网络，由一个或多个地址范围（CIDR 块）定义。',
  'A Virtual WAN hub is the Microsoft-managed regional hub VNet that spokes and branches connect into.':
    '虚拟 WAN 中心是由 Microsoft 托管的区域中心 VNet，分支和辐射网络连接到该中心。',
  'A WAF policy is the rule set that inspects HTTP requests for common web attacks such as SQL injection and cross-site scripting.':
    'WAF 策略是检查 HTTP 请求中常见 Web 攻击（如 SQL 注入和跨站脚本）的规则集。',
  'A client application or device making the request.': '发起请求的客户端应用程序或设备。',
  'A command-line session such as PowerShell, Bash, or Azure CLI.':
    'PowerShell、Bash 或 Azure CLI 等命令行会话。',
  'A custom element added to represent something outside the standard Azure resource set.':
    '添加的自定义元素，用于表示标准 Azure 资源集之外的事物。',
  'A legitimate request being blocked shows up as a 403 — check the WAF logs for the triggering rule ID and add an exclusion.':
    '合法请求被阻止时会表现为 403。请在 WAF 日志中查找触发的规则 ID 并添加排除项。',
  'A listener accepts the request on the front-end IP, a rule matches it, and the request is forwarded to a backend pool member that the health probe reports as healthy.':
    '侦听器在前端 IP 上接受请求，规则与之匹配后，请求被转发到运行状况探测报告为正常的后端池成员。',
  'A load-balancing rule maps a front-end IP and port to a backend pool and port. It does not inspect or modify the payload, so it cannot route by URL.':
    '负载均衡规则将前端 IP 和端口映射到后端池和端口。它不检查或修改有效负载，因此无法按 URL 路由。',
  'A missing or wrong prefix here is the single most common cause of "the tunnel is up but traffic does not pass".':
    '此处缺少或填错前缀，是“隧道已建立但流量不通”最常见的单一原因。',
  'A mobile device acting as the client.': '作为客户端的移动设备。',
  'A person or role involved in the flow.': '参与该流量路径的人员或角色。',
  'A portal error is control plane (ARM, RBAC, policy) — it is not evidence of a data-path problem.':
    '门户报错属于控制平面问题（ARM、RBAC、策略），并不能证明数据路径存在问题。',
  'A resource group is a logical container that holds related Azure resources.':
    '资源组是承载相关 Azure 资源的逻辑容器。',
  'A resource group is a management construct only — it does not affect network reachability. Two resources in different resource groups talk to each other normally.':
    '资源组仅是管理层面的构造，不影响网络可达性。位于不同资源组的两个资源之间可以正常通信。',
  'A route table holds User-Defined Routes that override the routes Azure creates by default.':
    '路由表保存用户定义路由，用于覆盖 Azure 默认创建的路由。',
  'A server — typically an on-premises or third-party host outside Azure.':
    '服务器，通常是 Azure 之外的本地主机或第三方主机。',
  'A subnet is a slice of the VNet address space where resources actually get their IP addresses.':
    '子网是 VNet 地址空间的一部分，资源实际在其中获取 IP 地址。',
  'A subscription is the billing and quota boundary that resources are created in.':
    '订阅是创建资源时所处的计费和配额边界。',
  'A user laptop or workstation.': '用户的笔记本电脑或工作站。',
  'AKS is managed Kubernetes — Azure runs the control plane and you run workloads in node pools.':
    'AKS 是托管 Kubernetes：控制平面由 Azure 运行，你在节点池中运行工作负载。',
  'API Management is a gateway that publishes, secures, and throttles APIs.':
    'API 管理是用于发布、保护和限流 API 的网关。',
  'Access can be restricted with the firewall and virtual network rules, or made fully private with a Private Endpoint per sub-resource (blob, file, and so on).':
    '可以通过防火墙和虚拟网络规则限制访问，也可以为每个子资源（blob、file 等）配置专用终结点以实现完全专用访问。',
  'Admins usually reach resources through the Azure portal, Bastion, or a jump host rather than the application front door.':
    '管理员通常通过 Azure 门户、Bastion 或跳板机访问资源，而不是通过应用程序的前门。',
  'An ASG is a label you attach to NICs so NSG rules can target a workload role instead of IP addresses.':
    'ASG 是附加到 NIC 上的标签，使 NSG 规则可以针对工作负载角色而非 IP 地址。',
  'An Azure region is a set of datacenters in one geography that hosts your resources.':
    'Azure 区域是位于同一地理位置、承载你的资源的一组数据中心。',
  'An ExpressRoute Gateway is the VNet-side endpoint that attaches a VNet to an ExpressRoute circuit.':
    'ExpressRoute 网关是将 VNet 连接到 ExpressRoute 线路的 VNet 侧终结点。',
  'An ExpressRoute circuit is a private Layer-3 connection between your network and Microsoft, provided by a connectivity partner.':
    'ExpressRoute 线路是由连接合作伙伴提供的、你的网络与 Microsoft 之间的专用第 3 层连接。',
  'An INBOUND endpoint gives on-premises an IP in Azure to forward queries to. An OUTBOUND endpoint plus a forwarding ruleset sends Azure queries for specific domains to on-premises DNS servers.':
    '入站终结点为本地提供一个 Azure 侧 IP，用于转发查询。出站终结点加上转发规则集，可将 Azure 中针对特定域的查询发送到本地 DNS 服务器。',
  'An IP Group is a named, reusable collection of IP addresses and ranges.':
    'IP 组是可重用的具名 IP 地址和范围集合。',
  'An NSG and a route table are attached at the subnet level, so every resource in the subnet inherits those rules. Some services require a dedicated, specially-named subnet (for example GatewaySubnet, AzureFirewallSubnet, AzureBastionSubnet).':
    'NSG 和路由表在子网级别关联，因此子网中的每个资源都会继承这些规则。某些服务需要专用且名称固定的子网（例如 GatewaySubnet、AzureFirewallSubnet、AzureBastionSubnet）。',
  'An NSG is a stateful packet filter with allow and deny rules based on source, destination, port, and protocol.':
    'NSG 是有状态的数据包筛选器，基于源、目标、端口和协议提供允许和拒绝规则。',
  'An NVA is a third-party firewall, router, or proxy running as a VM inside your VNet.':
    'NVA 是以虚拟机形式运行在你的 VNet 内的第三方防火墙、路由器或代理。',
  'An administrator performing management or troubleshooting work.': '执行管理或故障排除工作的管理员。',
  'An image pull failure over Private Link is nearly always DNS — verify the registry name resolves to the private IP.':
    '通过 Private Link 拉取映像失败几乎总是 DNS 问题，请确认注册表名称解析到专用 IP。',
  'App Service is a managed platform for hosting web apps and APIs without managing servers.':
    '应用服务是托管平台，可在无需管理服务器的情况下承载 Web 应用和 API。',
  'Application Gateway for Containers is the Kubernetes-native Layer-7 ingress built on the Application Gateway platform.':
    'Application Gateway for Containers 是基于应用程序网关平台构建的 Kubernetes 原生第 7 层入口。',
  'Application Gateway is a regional Layer-7 (HTTP/HTTPS) load balancer.':
    '应用程序网关是区域级的第 7 层（HTTP/HTTPS）负载均衡器。',
  'Application rules need the FQDN; if the client resolves DNS differently, the rule will not match.':
    '应用程序规则需要 FQDN；如果客户端的 DNS 解析结果不同，规则将无法匹配。',
  'Asymmetric routing is a classic failure — the return path must also traverse the firewall.':
    '非对称路由是典型故障，返回路径也必须经过同一防火墙。',
  'Azure Bastion is a managed jump host that gives browser-based RDP and SSH access to VMs.':
    'Azure Bastion 是托管跳板机，可通过浏览器对虚拟机进行 RDP 和 SSH 访问。',
  'Azure Container Registry stores and serves your container images.':
    'Azure 容器注册表用于存储和分发你的容器映像。',
  'Azure Firewall is a managed, stateful network firewall that inspects traffic against DNAT, network, and application rules.':
    'Azure Firewall 是托管的有状态网络防火墙，按 DNAT 规则、网络规则和应用程序规则检查流量。',
  'Azure Firewall rules reference the IP Group by name in the source or destination field.':
    'Azure Firewall 规则在源或目标字段中按名称引用 IP 组。',
  'Azure Load Balancer is a Layer-4 (TCP/UDP) load balancer that spreads connections across a backend pool.':
    'Azure 负载均衡器是第 4 层（TCP/UDP）负载均衡器，可将连接分散到后端池中。',
  'Azure SQL Database is a managed relational database service.': 'Azure SQL 数据库是托管的关系型数据库服务。',
  'Azure needs to know which address ranges live on the far side of the tunnel so it can route to them.':
    'Azure 需要知道隧道另一端有哪些地址范围，才能将流量路由过去。',
  'Azure protects its platform by default, but a Network Protection plan tunes mitigation to YOUR traffic and adds attack telemetry plus cost protection.':
    'Azure 默认保护其平台，但网络防护计划会针对你的流量调整缓解策略，并提供攻击遥测和成本保护。',
  'Because it is DNS-based, client-side DNS caching and TTL delay failover — check the TTL.':
    '由于基于 DNS，客户端 DNS 缓存和 TTL 会延迟故障转移，请检查 TTL。',
  'Both the source and destination ASG must be in the SAME virtual network for a rule to work.':
    '规则要生效，源 ASG 和目标 ASG 必须位于同一个虚拟网络中。',
  'Caching can mask a backend change — purge before concluding the backend is wrong.':
    '缓存可能掩盖后端的更改，在断定后端有问题之前请先清除缓存。',
  'Capture the exact command and full error text — it usually names the failing endpoint and port.':
    '请完整记录所执行的命令和完整错误文本，其中通常会指出失败的终结点和端口。',
  'Check BGP session state and the advertised/received route counts on each peering.':
    '检查每个对等互连上的 BGP 会话状态以及已通告/已接收的路由数量。',
  'Check DDoS mitigation metrics before assuming an outage is application-side.':
    '在断定故障出在应用程序侧之前，请先检查 DDoS 缓解指标。',
  'Check SNAT port utilisation metrics if outbound connections start failing intermittently.':
    '如果出站连接开始间歇性失败，请检查 SNAT 端口利用率指标。',
  'Check backend health first — an unhealthy pool returns 502.':
    '首先检查后端运行状况：后端池不正常时会返回 502。',
  'Check connection status and the ingress/egress byte counters — zero bytes with a Connected state points at routing, not the tunnel.':
    '检查连接状态和入站/出站字节计数器：状态为“已连接”但字节数为零，说明问题在路由而非隧道。',
  'Check container logs and restart count first — an app crash looks like a network failure from outside.':
    '请先检查容器日志和重启次数：应用崩溃从外部看起来就像网络故障。',
  'Check effective routes and effective security rules on the NIC.': '检查 NIC 上的有效路由和有效安全规则。',
  'Check effective routes on a NIC in this VNet to see what next hop Azure is actually using.':
    '检查该 VNet 中某个 NIC 的有效路由，查看 Azure 实际使用的下一跃点。',
  'Check effective routes on the NIC — that is the ground truth, not the route table definition.':
    '请检查 NIC 上的有效路由，这才是实际情况，而不是路由表中的定义。',
  'Check endpoint monitor status; an endpoint marked Degraded is removed from responses.':
    '检查终结点监视状态；标记为“已降级”的终结点会从响应中移除。',
  'Check for a delete lock or Azure Policy assignment at this scope if a deployment is failing.':
    '如果部署失败，请检查该范围内是否存在删除锁或 Azure Policy 分配。',
  'Check for asymmetric routing — both directions must traverse the same appliance instance.':
    '检查是否存在非对称路由：两个方向都必须经过同一台设备实例。',
  'Check health probe status — if every instance is unhealthy the load balancer silently drops traffic.':
    '检查运行状况探测状态：如果所有实例都不正常，负载均衡器会静默丢弃流量。',
  'Check hub routing status and the effective routes for the connection in question.':
    '检查中心的路由状态以及相关连接的有效路由。',
  'Check origin health probes and the origin host header setting — a mismatch causes 4xx from the origin.':
    '检查源站运行状况探测和源站主机头设置：不匹配会导致源站返回 4xx。',
  'Check priority ordering — a broad deny in a parent policy silently overrides a child allow.':
    '检查优先级顺序：父策略中范围较广的拒绝规则会静默覆盖子策略中的允许规则。',
  'Check that the on-premises prefixes are present in the Local Network Gateway (or advertised via BGP).':
    '确认本地网络网关中已包含本地地址前缀（或通过 BGP 通告）。',
  'Check that the on-premises router actually advertises the local prefixes, and that it learns the Azure address space.':
    '确认本地路由器确实通告了本地前缀，并且学习到了 Azure 的地址空间。',
  'Check the A record exists and points at the expected IP.': '确认 A 记录存在且指向预期的 IP。',
  'Check the ALB controller pod logs in the cluster.': '检查群集中 ALB 控制器 Pod 的日志。',
  'Check the NSG attached to this subnet — subnet rules are evaluated before NIC rules for inbound traffic.':
    '检查关联到该子网的 NSG：对于入站流量，子网规则先于 NIC 规则求值。',
  'Check the connection state is Approved, not Pending.': '确认连接状态为“已批准”，而不是“挂起”。',
  'Check the default rules — DenyAllInbound at priority 65500 catches anything you did not explicitly allow.':
    '检查默认规则：优先级 65500 的 DenyAllInbound 会拦截所有未显式允许的流量。',
  'Check the effective routes on the hub route table, not just on the spoke.':
    '不仅要看辐射网络，还要检查中心路由表上的有效路由。',
  'Check the firewall logs for the specific flow — they tell you which rule allowed or denied it.':
    '针对具体流量检查防火墙日志，日志会指出是哪条规则允许或拒绝了它。',
  'Check the forwarding ruleset is linked to the VNet, and that the rule domain name ends with a trailing dot.':
    '确认转发规则集已链接到 VNet，并且规则中的域名以点号结尾。',
  'Check the number of routes learned — exceeding the route limit drops the BGP session.':
    '检查学习到的路由数量：超出路由上限会导致 BGP 会话中断。',
  'Check the policy trace for the failing call — the answer is usually a policy, not the network.':
    '针对失败的调用检查策略跟踪：原因通常是策略，而不是网络。',
  'Check the route on the server itself — it must know to send the Azure prefixes to the tunnel.':
    '检查服务器自身的路由：它必须知道要将发往 Azure 前缀的流量送入隧道。',
  'Check the route table attached to this subnet for a UDR that overrides the default system route.':
    '检查关联到该子网的路由表中是否存在覆盖默认系统路由的 UDR。',
  'Check the service is actually available in this region (some SKUs are region-limited).':
    '确认该服务在此区域确实可用（部分 SKU 存在区域限制）。',
  'Check the service type — ClusterIP is cluster-internal only, LoadBalancer creates an Azure load balancer.':
    '检查服务类型：ClusterIP 仅限群集内部，LoadBalancer 会创建 Azure 负载均衡器。',
  'Check what the client resolves the name to, and from which network it is connecting.':
    '检查客户端将该名称解析成了什么，以及它是从哪个网络发起连接的。',
  'Check whether Access Restrictions are blocking the caller.': '检查访问限制是否阻止了调用方。',
  'Check whether the client is on the corporate network, on VPN, or on the public internet, because the path differs.':
    '确认客户端位于企业网络、VPN 还是公共 Internet 上，因为路径各不相同。',
  'Check whether unhealthy instances are being rolled — an instance can be up but failing its probe.':
    '检查是否正在轮换不正常的实例：实例可能已启动但探测失败。',
  'Circuits are redundant by design — verify BOTH links, not just the primary.':
    '线路在设计上是冗余的，请同时验证两条链路，而不仅是主链路。',
  'Client-side caching can hide a fix — flush the resolver cache before retesting.':
    '客户端缓存可能掩盖修复效果，重新测试前请清除解析器缓存。',
  'Compare a lookup and a connection test from the laptop against the same test run inside Azure.':
    '将笔记本电脑上的名称解析和连接测试结果，与在 Azure 内执行的同一测试进行对比。',
  'Compare the IPsec policy on this connection with the on-premises configuration line by line.':
    '将此连接的 IPsec 策略与本地配置逐行比对。',
  'Compute platforms need somewhere private and close to pull images from at deployment time.':
    '计算平台在部署时需要一个专用且就近的位置来拉取映像。',
  'Confirm IP forwarding is enabled if this NIC belongs to an NVA that must route traffic for others.':
    '如果该 NIC 属于需要为其他资源转发流量的 NVA，请确认已启用 IP 转发。',
  'Confirm a UDR actually forces the traffic through the firewall; without it traffic bypasses the firewall entirely.':
    '确认确实有 UDR 强制流量经过防火墙；没有 UDR 时流量会完全绕过防火墙。',
  'Confirm a virtual network link exists between the zone and the client VNet — without it the zone is invisible.':
    '确认该区域与客户端 VNet 之间存在虚拟网络链接；否则该区域不可见。',
  'Confirm backend certificate validation settings if the backend uses a private CA.':
    '如果后端使用专用 CA，请确认后端证书验证设置。',
  'Confirm both sides of the flow are in the region you expect — cross-region hops add latency and egress charges.':
    '确认流量两端都位于预期的区域：跨区域跃点会增加延迟和出口费用。',
  'Confirm the NIC really is a member — an unassigned NIC silently falls through to the deny rule.':
    '确认该 NIC 确实是成员：未加入的 NIC 会静默落入拒绝规则。',
  'Confirm the NSG on the Application Gateway subnet allows the required inbound ports from the GatewayManager service tag.':
    '确认应用程序网关子网上的 NSG 允许来自 GatewayManager 服务标记的必需入站端口。',
  'Confirm the NSG on the backend NICs or subnet allows the probe source (AzureLoadBalancer service tag) and the data port.':
    '确认后端 NIC 或子网上的 NSG 允许探测源（AzureLoadBalancer 服务标记）和数据端口。',
  'Confirm the Private DNS Zone is linked to the VNet the client sits in, and that the A record exists.':
    '确认专用 DNS 区域已链接到客户端所在的 VNet，并且 A 记录存在。',
  'Confirm the UDR next hop points at the NVA private IP (or the internal load balancer front end for an HA pair).':
    '确认 UDR 的下一跃点指向 NVA 的专用 IP（若为高可用对，则指向内部负载均衡器前端）。',
  'Confirm the VNet DNS setting (Azure-provided vs custom DNS servers) matches what the workload expects.':
    '确认 VNet 的 DNS 设置（Azure 提供的 DNS 还是自定义 DNS 服务器）与工作负载的预期一致。',
  'Confirm the VNet connection propagates to, and associates with, the route tables you expect.':
    '确认 VNet 连接按预期传播到并关联了相应的路由表。',
  'Confirm the VNet is actually associated with the plan.': '确认该 VNet 确实已与该计划关联。',
  'Confirm the address is actually associated with the resource you think it is.':
    '确认该地址确实关联到你认为的那个资源上。',
  'Confirm the address you expect is really in the group — a missing entry looks exactly like a firewall deny.':
    '确认预期的地址确实在该组中：条目缺失看起来与防火墙拒绝完全一样。',
  'Confirm the admin path (Bastion, VPN, or portal) separately — it can fail while the app path works.':
    '请单独验证管理路径（Bastion、VPN 或门户）：应用路径正常时管理路径仍可能失败。',
  'Confirm the application is actually listening on the expected port (netstat or ss).':
    '确认应用程序确实在预期端口上侦听（使用 netstat 或 ss）。',
  'Confirm the association subnet is delegated correctly and has free addresses.':
    '确认关联子网已正确委派且有可用地址。',
  'Confirm the circuit status is Provisioned and the peering is configured on both the provider and Microsoft side.':
    '确认线路状态为“已预配”，并且提供商侧和 Microsoft 侧都已配置对等互连。',
  'Confirm the consumer connection request has been approved.': '确认使用方的连接请求已获批准。',
  'Confirm the gateway SKU supports the required throughput and the number of circuit connections.':
    '确认网关 SKU 支持所需的吞吐量和线路连接数量。',
  'Confirm the local firewall and any host-based firewall permit the flow in both directions.':
    '确认本地防火墙以及任何基于主机的防火墙都在双向上允许该流量。',
  'Confirm the on-premises conditional forwarder points at the inbound endpoint IP, and that UDP and TCP port 53 are open across the tunnel.':
    '确认本地条件转发器指向入站终结点 IP，并且隧道上 UDP 和 TCP 的 53 端口均已开放。',
  'Confirm the on-premises firewall permits the required ports in BOTH directions.':
    '确认本地防火墙在两个方向上都允许所需端口。',
  'Confirm the origin only accepts traffic from Front Door (X-Azure-FDID header or the AzureFrontDoor.Backend service tag).':
    '确认源站仅接受来自 Front Door 的流量（X-Azure-FDID 标头或 AzureFrontDoor.Backend 服务标记）。',
  'Confirm the hosting plan supports the networking feature you need — the classic Consumption plan has no VNet integration, while Flex Consumption and Premium do.': '确认托管计划支持您所需的网络功能 — 传统的 Consumption 计划没有 VNet 集成，而 Flex Consumption 和 Premium 有。',
  'Confirm the policy is actually associated with the firewall handling this traffic.':
    '确认该策略确实已关联到处理此流量的防火墙。',
  'Confirm the public IP matches the on-premises device address seen from the internet after NAT.':
    '确认公共 IP 与经过 NAT 后从 Internet 上看到的本地设备地址一致。',
  'Confirm the pulling identity has the AcrPull role.': '确认执行拉取的标识具有 AcrPull 角色。',
  'Confirm the server firewall rules or Private Endpoint permit the client.':
    '确认服务器防火墙规则或专用终结点允许该客户端。',
  'Confirm the subnet has enough free addresses for the maximum pods per node under Azure CNI.':
    '在使用 Azure CNI 时，确认子网有足够的可用地址来容纳每个节点的最大 Pod 数。',
  'Confirm the subnet is large enough — Azure reserves 5 addresses in every subnet.':
    '确认子网足够大：Azure 会在每个子网中保留 5 个地址。',
  'Confirm the tunnel is Connected, not just Provisioned.': '确认隧道状态为“已连接”，而不仅是“已预配”。',
  'Confirm the upgrade policy is not mid-rollout when investigating inconsistent behaviour.':
    '排查行为不一致的问题时，确认升级策略未处于滚动发布过程中。',
  'Confirm what the client actually resolves the name to — a wrong DNS answer sends traffic to the wrong place.':
    '确认客户端实际将该名称解析成了什么：错误的 DNS 应答会把流量送到错误的地方。',
  'Confirm whether the policy is in Detection or Prevention mode before concluding it is not the cause.':
    '在断定策略不是原因之前，先确认它处于检测模式还是防护模式。',
  'Consumers create a Private Endpoint that requests a connection; you approve it. Traffic arrives with the source NAT applied by the platform.':
    '使用方创建专用终结点来请求连接，由你批准。流量到达时已由平台应用源 NAT。',
  'Container Instances runs a single container without any cluster to manage.':
    '容器实例运行单个容器，无需管理任何群集。',
  'Cosmos DB is a globally distributed NoSQL database with low-latency reads and writes.':
    'Cosmos DB 是全球分布式 NoSQL 数据库，具有低延迟的读写能力。',
  'Cross-subscription peering and Private Link need permissions in BOTH subscriptions.':
    '跨订阅的对等互连和 Private Link 需要在两个订阅中都具备权限。',
  'Customers use one when they need a specific vendor feature set, or want the same appliance on-premises and in Azure.':
    '当需要特定供应商的功能集，或希望在本地和 Azure 中使用相同设备时，客户会选择它。',
  'DNS Private Resolver is a managed service that resolves DNS between on-premises and Azure without you running DNS server VMs.':
    'DNS 专用解析程序是托管服务，无需你运行 DNS 服务器虚拟机即可在本地与 Azure 之间解析 DNS。',
  'DNS is the number-one cause of failure — run a lookup from the client and confirm it returns the private IP, not the public one.':
    'DNS 是排名第一的故障原因：请从客户端执行解析，确认返回的是专用 IP 而不是公共 IP。',
  'Direct mode needs TCP 10250-10255 and 10000-20000 open; gateway mode only needs 443.':
    '直接模式需要开放 TCP 10250-10255 和 10000-20000；网关模式仅需 443。',
  'Each sub-resource needs its OWN Private Endpoint and its own privatelink DNS zone.':
    '每个子资源都需要各自独立的专用终结点和各自的 privatelink DNS 区域。',
  'Effective routes and effective security rules are both read from the NIC — always start here.':
    '有效路由和有效安全规则都从 NIC 上读取，请始终从这里开始排查。',
  'Enable VNet flow logs for a historical record of allow and deny decisions.':
    '启用 VNet 流日志，以保留允许和拒绝判定的历史记录。',
  'Every traffic flow needs an origin — this is the person or application whose experience you are troubleshooting.':
    '每条流量路径都需要一个起点，也就是你正在排查其体验的人员或应用程序。',
  'Everything drawn inside this boundary is deployed in the same region, so traffic between those resources stays on the regional network rather than crossing the internet.':
    '画在此边界内的所有内容都部署在同一区域，因此这些资源之间的流量留在区域网络内，而不会穿越 Internet。',
  'Firewall Policy is the reusable rule container that one or more Azure Firewalls apply.':
    '防火墙策略是可重用的规则容器，可供一个或多个 Azure Firewall 应用。',
  'For Private Endpoints, the zone name must match the required pattern exactly (for example privatelink.blob.core.windows.net).':
    '对于专用终结点，区域名称必须与要求的模式完全一致（例如 privatelink.blob.core.windows.net）。',
  'For Standard SKU, remember inbound is closed by default until an NSG rule opens it.':
    '对于标准 SKU，请注意入站默认关闭，直到有 NSG 规则将其开放。',
  'For TLS errors, check certificate expiry, chain, and whether the backend hostname matches the certificate.':
    '对于 TLS 错误，请检查证书有效期、证书链，以及后端主机名是否与证书匹配。',
  'For an internal load balancer, confirm the client is on a network that can reach the private front-end IP.':
    '对于内部负载均衡器，请确认客户端所在网络能够访问专用前端 IP。',
  'For inbound: confirm the public IP, the NSG allow rule, and the health of the backend.':
    '对于入站：确认公共 IP、NSG 允许规则以及后端的运行状况。',
  'For outbound VNet integration, WEBSITE_DNS_SERVER and route-all settings decide whether traffic uses VNet DNS and routes.':
    '对于出站 VNet 集成，WEBSITE_DNS_SERVER 和 route-all 设置决定流量是否使用 VNet 的 DNS 和路由。',
  'For outbound: confirm an explicit method exists — a NAT Gateway, a load balancer outbound rule, or a public IP on the NIC. Default outbound access was retired on 30 September 2025, so a new VM without one of these has no internet access at all.': '对于出站流量：确认存在明确的方法 — NAT Gateway、负载均衡器出站规则或 NIC 上的公共 IP。默认出站访问已于 2025 年 9 月 30 日停用，因此没有上述任何一项的新建 VM 完全无法访问 Internet。',
  'Front Door is a global Layer-7 entry point with content delivery and WAF built in.':
    'Front Door 是全球性的第 7 层入口，内置内容分发和 WAF。',
  'Gateway, Firewall, and Bastion subnets must use their exact reserved names or deployment fails.':
    'Gateway、Firewall 和 Bastion 子网必须使用各自保留的确切名称，否则部署会失败。',
  'Hybrid flows depend on it, and it is frequently the piece nobody has console access to during a call.':
    '混合场景的流量依赖于它，而在通话过程中往往没人能访问它的控制台。',
  'IKE phase 1/2 settings, PSK, and the IPsec policy must match EXACTLY on both ends.':
    'IKE 第 1/2 阶段设置、预共享密钥和 IPsec 策略必须在两端完全一致。',
  'IP forwarding must be enabled on the NVA NIC in Azure AND inside the guest OS.':
    '必须同时在 Azure 中的 NVA NIC 上和来宾操作系统内部启用 IP 转发。',
  'If the account firewall is set to selected networks, confirm the caller subnet or IP is listed.':
    '如果帐户防火墙设置为“选定网络”，请确认调用方的子网或 IP 已列入其中。',
  'If the firewall is restricted, confirm the caller network or the trusted-services exception is allowed.':
    '如果启用了防火墙限制，请确认已允许调用方网络或受信任服务例外。',
  'Inbound and outbound are configured independently — confirm which direction is failing.':
    '入站和出站是独立配置的，请先确认失败的是哪个方向。',
  'Inbound and outbound endpoints each need their own delegated subnet.':
    '入站终结点和出站终结点各自需要独立的委派子网。',
  'Inbound internet traffic lands on a public IP attached to a gateway, load balancer, or VM. Outbound traffic leaves through a NAT Gateway, a load balancer, or a firewall.':
    '来自 Internet 的入站流量落到附加在网关、负载均衡器或虚拟机上的公共 IP。出站流量则通过 NAT 网关、负载均衡器或防火墙离开。',
  'Inbound private access uses a Private Endpoint. Outbound access into a VNet uses regional VNet integration — the two are separate features.':
    '入站专用访问使用专用终结点；进入 VNet 的出站访问使用区域 VNet 集成。二者是不同的功能。',
  'Individual public IPs are then allocated from the prefix and assigned to resources such as a NAT Gateway or load balancer.':
    '随后从该前缀中分配单个公共 IP，并指派给 NAT 网关或负载均衡器等资源。',
  'Instances share one network configuration and normally sit in a load balancer or Application Gateway backend pool.':
    '各实例共享同一套网络配置，通常位于负载均衡器或应用程序网关的后端池中。',
  'It answers "is this being blocked, and by what?" with data instead of guesswork.':
    '它用数据而非猜测来回答“流量是否被阻止、被什么阻止”。',
  'It attaches to Application Gateway or Front Door and runs in Detection mode (log only) or Prevention mode (block).':
    '它附加到应用程序网关或 Front Door，并以检测模式（仅记录）或防护模式（阻止）运行。',
  'It attaches to a subnet, a NIC, or both. Rules are evaluated by priority, lowest number first, and the first match wins. Because it is stateful, return traffic for an allowed flow is permitted automatically.':
    '它可关联到子网、NIC 或两者。规则按优先级从小到大求值，首个匹配项生效。由于它是有状态的，已允许流量的返回流量会被自动放行。',
  'It attaches to a subnet. Azure picks the most specific matching prefix; if two routes tie, a UDR beats a BGP route, which beats a system route.':
    '它关联到子网。Azure 会选择最具体的匹配前缀；若两条路由长度相同，则 UDR 优先于 BGP 路由，BGP 路由优先于系统路由。',
  'It attaches to one or more subnets. Once attached, it takes priority over all other outbound methods for those subnets. It never allows unsolicited inbound traffic.':
    '它可关联到一个或多个子网。关联后，对这些子网而言它优先于所有其他出站方式。它绝不允许未经请求的入站流量。',
  'It avoids the public internet entirely, giving predictable latency, higher bandwidth, and an SLA.':
    '它完全避开公共 Internet，从而提供可预测的延迟、更高的带宽和 SLA。',
  'It blocks application-layer attacks that a Layer-4 firewall or NSG cannot see, because those only look at IP and port.':
    '它可阻止第 4 层防火墙或 NSG 无法察觉的应用层攻击，因为后者只查看 IP 和端口。',
  'It can be deployed into a VNet subnet for private access, or given a public IP for direct access.':
    '既可部署到 VNet 子网中以实现专用访问，也可分配公共 IP 以便直接访问。',
  'It can be external (public front end) or internal (VNet-only). In VNet mode it has strict required NSG rules and dependency endpoints.':
    '它可以是外部（公共前端）或内部（仅限 VNet）。在 VNet 模式下，它有严格的必需 NSG 规则和依赖终结点。',
  'It can be reached publicly, or privately through a Private Endpoint with the matching Private DNS Zone.':
    '既可公开访问，也可通过配有对应专用 DNS 区域的专用终结点进行专用访问。',
  'It cannot be used for inbound; if inbound is needed, that is a separate load balancer or public IP.':
    '它不能用于入站；如需入站，则要另行配置负载均衡器或公共 IP。',
  'It carries the shared key, the IPsec/IKE policy, and the BGP setting for that specific link.':
    '它承载该特定链路的共享密钥、IPsec/IKE 策略和 BGP 设置。',
  'It centralises egress control and logging, so one policy governs what an entire hub-and-spoke estate is allowed to reach.':
    '它集中管理出站控制和日志，使一条策略即可管辖整个中心辐射型环境允许访问的目标。',
  'It clarifies who experiences the behaviour being described.': '它明确指出是谁在经历所描述的现象。',
  'It connects from the office LAN, from home, or through a VPN client, and each path resolves DNS differently.':
    '它可能从办公室局域网、家中或通过 VPN 客户端连接，而每条路径的 DNS 解析结果都不同。',
  'It connects over the public internet unless a VPN profile is applied.':
    '除非应用了 VPN 配置文件，否则它通过公共 Internet 连接。',
  'It connects to Azure through a Site-to-Site VPN tunnel or an ExpressRoute circuit. Routes are exchanged either statically or via BGP.':
    '它通过站点到站点 VPN 隧道或 ExpressRoute 线路连接到 Azure。路由以静态方式或通过 BGP 交换。',
  'It connects to a subnet through a NIC. Its reachability is governed by the NSG on that NIC and on the subnet, plus the guest OS firewall.':
    '它通过 NIC 连接到子网。其可达性由该 NIC 和子网上的 NSG 以及来宾操作系统防火墙共同决定。',
  'It gives container workloads scheduling, self-healing, and scaling without you operating Kubernetes masters.':
    '它为容器工作负载提供调度、自愈和扩缩能力，而无需你运维 Kubernetes 主节点。',
  'It gives one consistent front door for many backends, with authentication, rate limiting, and transformation applied by policy.':
    '它为众多后端提供统一一致的入口，并通过策略应用身份验证、限流和转换。',
  'It gives you a predictable, unchanging range so partners and firewalls can allow-list your egress addresses once.':
    '它提供可预测且不变的地址范围，使合作伙伴和防火墙只需一次性将你的出口地址加入允许列表。',
  'It gives you a stable, known egress address and a very large pool of SNAT ports, which prevents the port-exhaustion failures common with default outbound access.':
    '它提供稳定且已知的出口地址和非常大的 SNAT 端口池，可避免默认出站访问常见的端口耗尽故障。',
  'It gives you private connectivity into the VNet over the public internet, without exposing resources publicly.':
    '它通过公共 Internet 提供进入 VNet 的专用连接，而不会将资源公开暴露。',
  'It gives your resources private IP addresses and a security boundary, so they can talk to each other privately instead of over the public internet.':
    '它为资源提供专用 IP 地址和安全边界，使它们能够私密通信，而不必经由公共 Internet。',
  'It groups resources with a shared lifecycle so they can be deployed, permissioned, and deleted together.':
    '它将生命周期一致的资源归为一组，便于一起部署、授权和删除。',
  'It handles scale and instance repair for you, so capacity follows demand without manual VM creation.':
    '它替你处理扩缩和实例修复，使容量随需求变化，而无需手动创建虚拟机。',
  'It injects the routes learned from on-premises into the VNet and forwards traffic onto the private circuit.':
    '它将从本地学到的路由注入 VNet，并将流量转发到专用线路上。',
  'It is deployed into a dedicated AzureBastionSubnet. The admin connects to the Azure portal over TLS, and Bastion opens the RDP or SSH session to the VM private IP.':
    '它部署在专用的 AzureBastionSubnet 中。管理员通过 TLS 连接到 Azure 门户，再由 Bastion 向虚拟机的专用 IP 建立 RDP 或 SSH 会话。',
  'It is enabled per region. IP flow verify names the exact NSG rule that allowed or denied a flow; next hop shows where a packet would actually be routed.':
    '它按区域启用。IP 流验证会指出允许或拒绝某条流量的确切 NSG 规则；下一跃点则显示数据包实际会被路由到哪里。',
  'It is reached over HTTPS. It can be locked down with firewall rules or a Private Endpoint, and callers usually authenticate with a managed identity.':
    '通过 HTTPS 访问。可使用防火墙规则或专用终结点进行加固，调用方通常使用托管标识进行身份验证。',
  'It is reached over TCP 1433. The connection policy is Redirect (which also needs ports 11000-11999) or Proxy (1433 only).':
    '通过 TCP 1433 访问。连接策略为 Redirect（还需要 11000-11999 端口）或 Proxy（仅 1433）。',
  'It is referenced by a Connection resource, which pairs it with the Azure VPN Gateway. With BGP, the prefix list is learned dynamically instead.':
    '它由 Connection 资源引用，从而与 Azure VPN 网关配对。若使用 BGP，则前缀列表改为动态学习。',
  'It is the basic segmentation control in Azure, but it does not deny by default: the built-in AllowVNetInBound rule already permits all traffic inside the virtual network, so segmentation starts only when you add your own higher-priority deny.': '它是 Azure 中的基本分段控制，但默认并不拒绝：内置的 AllowVNetInBound 规则已允许虚拟网络内的所有流量，因此只有在您添加自己的更高优先级拒绝规则后，分段才会生效。',
  'It is the control plane. Control-plane and data-plane failures look similar to users but have different causes.':
    '这属于控制平面。控制平面与数据平面的故障在用户看来相似，但原因不同。',
  'It is the destination doing the actual work — serving the page, running the query, hosting the application.':
    '它是真正执行工作的目标：提供页面、执行查询、承载应用程序。',
  'It is the general-purpose durable store that most workloads read from and write to.':
    '它是大多数工作负载读写的通用持久化存储。',
  'It is the most common place a reported issue is actually observed.': '这是所报告问题最常被实际观察到的位置。',
  'It is what makes a resource reachable from the internet, and it identifies your traffic when it leaves Azure.':
    '它使资源可从 Internet 访问，并在流量离开 Azure 时标识你的流量。',
  'It is where a VM gets its IP configuration, and it is the most precise place to attach an NSG or check what rules and routes actually apply.':
    '虚拟机在此获取其 IP 配置，这也是关联 NSG 或查看实际生效规则与路由的最精确位置。',
  'It keeps credentials out of code and configuration, and gives you an audit trail of who read what.':
    '它使凭据不出现在代码和配置中，并提供谁读取了什么的审核记录。',
  'It keeps firewall rules readable and lets you update one object instead of editing many rules.':
    '它让防火墙规则保持易读，只需更新一个对象，而不必修改许多规则。',
  'It keeps rules meaningful as the environment scales — "web can reach app" survives every IP change.':
    '它使规则在环境扩展时仍然有意义：“Web 可以访问 App”不会因任何 IP 变更而失效。',
  'It lets AKS workloads use Gateway API and Ingress objects to publish services without hand-managing gateway configuration.':
    '它让 AKS 工作负载可以使用 Gateway API 和 Ingress 对象发布服务，而无需手动管理网关配置。',
  'It lets you offer a service to customers or other business units without peering networks or exposing anything publicly.':
    '它让你无需对等互连网络或公开暴露任何内容，即可向客户或其他业务部门提供服务。',
  'It lets you reach a PaaS service such as Storage or SQL over a private IP on the Microsoft backbone, so the public endpoint can be disabled entirely.':
    '它让你通过 Microsoft 主干网上的专用 IP 访问存储或 SQL 等 PaaS 服务，从而可以完全禁用公共终结点。',
  'It lets you write rules once and inherit them across firewalls, with a parent policy for organisation-wide rules and child policies per environment.':
    '它让你只需编写一次规则即可在多个防火墙间继承：父策略承载组织级规则，子策略按环境划分。',
  'It lives in the reserved GatewaySubnet and pairs with a Local Network Gateway (the remote device) through a Connection resource. Routes are static or learned via BGP.':
    '它位于保留的 GatewaySubnet 中，并通过 Connection 资源与本地网络网关（远端设备）配对。路由为静态或通过 BGP 学习。',
  'It marks where the user-visible experience begins, which is the perspective the customer is reporting from.':
    '它标记用户可见体验的起点，也就是客户报告问题时所处的视角。',
  'It never sees your traffic. It only returns a CNAME or IP in a DNS answer, so the client connects directly to the chosen endpoint afterwards.':
    '它绝不会看到你的流量。它只在 DNS 应答中返回 CNAME 或 IP，之后客户端会直接连接所选的终结点。',
  'It only works if DNS resolves the service hostname to the private IP. That is normally done with a Private DNS Zone linked to the VNet.':
    '只有当 DNS 将服务主机名解析为专用 IP 时它才有效。通常通过链接到 VNet 的专用 DNS 区域来实现。',
  'It provides a SQL Server-compatible database without you patching, backing up, or clustering servers.':
    '它提供与 SQL Server 兼容的数据库，而无需你为服务器打补丁、备份或做群集。',
  'It provides high availability and scale — if one backend instance fails its health probe, new connections stop going to it.':
    '它提供高可用性和扩展能力：如果某个后端实例健康探测失败，新连接就不再发往该实例。',
  'It provides transit routing between everything attached to it, without you having to build gateway chaining or route tables by hand.':
    '它在所有连接到它的对象之间提供中转路由，而无需你手动搭建网关链接或路由表。',
  'It reaches Azure APIs over HTTPS, or reaches workloads directly over SSH, RDP, or an application port.':
    '它通过 HTTPS 访问 Azure API，或通过 SSH、RDP 或应用端口直接访问工作负载。',
  'It reaches Azure across a VPN tunnel or ExpressRoute circuit, or over the public internet.':
    '它通过 VPN 隧道、ExpressRoute 线路或公共 Internet 访问 Azure。',
  'It removes OS patching and scaling work, so teams ship application code instead of infrastructure.':
    '它免去了操作系统打补丁和扩缩工作，使团队交付的是应用代码而不是基础结构。',
  'It removes the need to give VMs public IPs or open 3389/22 to the internet, which is one of the most exploited misconfigurations.':
    '它免去了为虚拟机分配公共 IP 或向 Internet 开放 3389/22 的需要，而后者是最常被利用的错误配置之一。',
  'It removes the work of building and maintaining your own hubs, route tables, and gateway meshes across many regions and branches.':
    '它免去了在众多区域和分支之间自行搭建并维护中心、路由表和网关网格的工作。',
  'It represents scripted or interactive commands, which are often where the reproduction steps live.':
    '它代表脚本化或交互式命令，重现步骤往往就在其中。',
  'It resolves the target name through DNS and then connects to the returned address.':
    '它通过 DNS 解析目标名称，然后连接到返回的地址。',
  'It routes by URL path and hostname, terminates TLS so certificates live in one place, and can run a Web Application Firewall in front of your app.':
    '它按 URL 路径和主机名路由，终止 TLS 使证书集中管理，并可在应用前运行 Web 应用程序防火墙。',
  'It separates billing, applies quota limits, and acts as a scope for role assignments and policy.':
    '它区分计费、施加配额限制，并作为角色分配和策略的作用域。',
  'It shares the App Service networking model — Private Endpoint for inbound, VNet integration for outbound. The hosting plan decides what is available: Flex Consumption and Premium both support VNet integration, the classic Consumption plan does not.': '它沿用 App Service 的网络模型 — 入站使用 Private Endpoint，出站使用 VNet 集成。可用功能取决于托管计划：Flex Consumption 和 Premium 均支持 VNet 集成，而传统的 Consumption 计划不支持。',
  'It sits in the GatewaySubnet and is linked to a circuit through a connection. Route exchange is always via BGP.':
    '它位于 GatewaySubnet 中，并通过连接与线路关联。路由交换始终通过 BGP 进行。',
  'It steers users to the closest or highest-priority region and removes failed regions from DNS answers.':
    '它将用户导向最近或优先级最高的区域，并从 DNS 应答中移除故障区域。',
  'It suits glue logic and triggers where running a full application host would be wasteful.':
    '它适合胶水逻辑和触发器场景，此时运行完整的应用宿主会造成浪费。',
  'It suits short-lived or bursty jobs where a full Kubernetes cluster would be overkill.':
    '它适合短时或突发型作业，此时使用完整的 Kubernetes 群集过于重量级。',
  'It suits workloads that need multi-region replication and predictable latency at scale.':
    '它适合需要多区域复制并在大规模下保持可预测延迟的工作负载。',
  'It terminates the user connection at the nearest Microsoft edge site, which cuts latency, and it fails over between regional backends automatically.':
    '它在最近的 Microsoft 边缘站点终止用户连接以降低延迟，并在各区域后端之间自动故障转移。',
  'Key Vault stores secrets, keys, and certificates with access controlled by policy or RBAC.':
    'Key Vault 存储机密、密钥和证书，访问权限由策略或 RBAC 控制。',
  'Make sure the return path has an equivalent route, or the flow becomes asymmetric and is dropped by the stateful firewall.':
    '确保回程路径有对应的路由，否则流量将变为不对称，并被有状态防火墙丢弃。',
  'Management traffic often takes a completely different path from application traffic and has its own controls.':
    '管理流量的路径往往与应用流量完全不同，并且有各自的控制机制。',
  'Mobile clients frequently arrive over carrier networks or a Point-to-Site VPN, so their path differs from office clients.':
    '移动客户端常通过运营商网络或点到站点 VPN 接入，因此其路径与办公客户端不同。',
  'Most enterprise workloads are hybrid, so Azure resources must reach systems that still live on-premises (and vice versa).':
    '大多数企业工作负载是混合式的，因此 Azure 资源必须能访问仍在本地的系统（反之亦然）。',
  'NAT Gateway is zonal — confirm the zone matches the workload for zone-resilient designs.':
    'NAT 网关是分区性的：在可用区弹性设计中，请确认其所在区与工作负载一致。',
  'NAT Gateway provides outbound-only internet connectivity for a subnet, using dedicated public IPs.':
    'NAT 网关使用专用公共 IP，为子网提供仅出站的 Internet 连接。',
  'NSGs and UDRs affect a Private Endpoint only when the subnet has PrivateEndpointNetworkPolicies enabled — it is disabled by default, so a rule you expect to match may never be evaluated at all.': '只有当子网启用了 PrivateEndpointNetworkPolicies 时，NSG 和 UDR 才会影响 Private Endpoint。该设置默认处于禁用状态，因此您以为会匹配的规则可能根本没有被评估。',
  'Native client and IP-based connection require the Standard or Premium SKU.':
    '本机客户端和基于 IP 的连接需要标准或高级 SKU。',
  'Network Watcher is the diagnostics toolbox for Azure networking — connection troubleshoot, IP flow verify, next hop, packet capture, and flow logs.':
    '网络观察程序是 Azure 网络的诊断工具箱：连接故障排除、IP 流验证、下一跃点、数据包捕获和流日志。',
  'Azure CNI is the current plugin and the IP mode is what matters. In node-subnet or pod-subnet mode every pod gets a real VNet IP, so pod addresses must be planned into the subnet size; CNI Overlay instead puts pods on a separate overlay range and consumes far fewer VNet IPs. Legacy kubenet is retiring on 31 March 2028.': '当前的插件是 Azure CNI，关键在于 IP 模式。在 node-subnet 或 pod-subnet 模式下，每个 Pod 都会获得真实的 VNet IP，因此必须将 Pod 地址纳入子网大小的规划；而 CNI Overlay 则将 Pod 放在独立的覆盖网络范围内，占用的 VNet IP 少得多。旧版 kubenet 将于 2028 年 3 月 31 日停用。',
  'Nothing reaches the right destination if the name resolves to the wrong address — DNS is the first hop of almost every flow.':
    '如果名称解析到错误的地址，就什么也到不了正确的目的地：DNS 几乎是每条流量的第一跃点。',
  'On-premises clients cannot query Azure Private DNS Zones directly, and Azure clients often need to resolve on-premises names. The resolver bridges both directions.':
    '本地客户端无法直接查询 Azure 专用 DNS 区域，而 Azure 客户端又常需解析本地名称。解析程序打通了这两个方向。',
  'One VM can have multiple NICs, and each NIC can hold multiple IP configurations. Accelerated Networking is enabled per NIC.':
    '一台虚拟机可以有多个 NIC，每个 NIC 可以持有多个 IP 配置。加速网络按 NIC 启用。',
  'Outbound type (load balancer, NAT Gateway, or userDefinedRouting) determines the egress path.':
    '出站类型（负载均衡器、NAT 网关或 userDefinedRouting）决定出口路径。',
  'Over Private Link, confirm the privatelink.vaultcore.azure.net zone is linked to the VNet.':
    '通过 Private Link 访问时，确认 privatelink.vaultcore.azure.net 区域已链接到该 VNet。',
  'Over Private Link, verify the name resolves to the private IP.':
    '通过 Private Link 访问时，验证名称解析到的是专用 IP。',
  'Portal actions call Azure Resource Manager over HTTPS; they do not traverse your VNet.':
    '门户操作通过 HTTPS 调用 Azure 资源管理器，不会经过你的 VNet。',
  'Private Endpoint requires a DNS record for every region the account is replicated to.':
    '专用终结点需要为帐户复制到的每个区域都提供 DNS 记录。',
  'Private Link Service publishes your own service, sitting behind a Standard internal load balancer, so other VNets can consume it via a Private Endpoint.':
    'Private Link 服务将位于标准内部负载均衡器之后的自有服务发布出去，使其他 VNet 可通过专用终结点使用它。',
  'Public-facing workloads must be reachable from the internet, and most workloads need outbound internet access for updates and API calls.':
    '面向公众的工作负载必须能从 Internet 访问，而大多数工作负载也需要出站 Internet 访问以进行更新和 API 调用。',
  'Real environments contain third-party appliances, SaaS endpoints, and legacy systems that still shape the traffic path.':
    '真实环境中包含第三方设备、SaaS 终结点和遗留系统，它们同样会影响流量路径。',
  'Redirect policy requires 11000-11999 outbound to be open — this is a very common firewall oversight.':
    'Redirect 策略要求开放 11000-11999 出站端口，这是防火墙上非常常见的疏漏。',
  'Region choice controls latency to your users, data-residency compliance, and which services and SKUs are even available.':
    '区域选择决定用户的访问延迟、数据驻留合规性，以及哪些服务和 SKU 可用。',
  'Remember inbound is evaluated subnet-first then NIC; outbound is NIC-first then subnet.':
    '请记住：入站先按子网再按 NIC 求值；出站先按 NIC 再按子网。',
  'Resource group membership never blocks traffic — if something is unreachable, look at NSG, UDR, DNS, or peering instead.':
    '资源组归属绝不会阻止流量：如果无法访问，请转而检查 NSG、UDR、DNS 或对等互连。',
  'Resources are placed in subnets inside the VNet. Everything in the same VNet can reach everything else by default; reaching another VNet requires peering, a gateway, or Private Link.':
    '资源放置在 VNet 内的子网中。同一 VNet 内的所有内容默认可互相访问；访问其他 VNet 则需要对等互连、网关或 Private Link。',
  'Resources in different subscriptions can still be peered and connected, but quota, policy, and RBAC are evaluated per subscription.':
    '不同订阅中的资源仍可对等互连和连接，但配额、策略和 RBAC 是按订阅分别求值的。',
  'Rule collection groups are evaluated by priority, and inherited parent rules always run before child rules.':
    '规则集合组按优先级求值，继承自父策略的规则始终先于子策略规则执行。',
  'Run IP flow verify for the failing 5-tuple — it names the deciding rule directly.':
    '针对失败的五元组运行 IP 流验证：它会直接指出起决定作用的规则。',
  'Run next hop from the source NIC to confirm the routing decision.':
    '从源 NIC 运行下一跃点，以确认路由决策。',
  'Secured hub (Routing Intent) changes the path — confirm whether traffic is being sent to Azure Firewall.':
    '安全中心（路由意向）会改变路径：请确认流量是否被送往 Azure Firewall。',
  'Service tags change over time; prefer them over hard-coded IP ranges.':
    '服务标记会随时间变化；应优先使用它们，而不是硬编码的 IP 范围。',
  'Standard SKU addresses are static and secure-by-default — inbound is denied unless an NSG allows it. Basic SKU is retired.':
    '标准 SKU 地址为静态且默认安全：除非有 NSG 允许，否则入站被拒绝。基本 SKU 已停用。',
  'Subnets let you segment a VNet so different tiers (web, app, data) can be secured and routed independently.':
    '子网让你分段划分 VNet，使不同层（Web、应用、数据）能够独立地进行安全控制和路由。',
  'Test on and off the corporate network — a split-tunnel VPN policy often explains "works for some users".':
    '请分别在公司网络内外测试：拆分隧道 VPN 策略常常能解释“部分用户可用”的现象。',
  'The ALB controller in the cluster watches Kubernetes objects and programs the gateway, forwarding HTTP/HTTPS traffic straight to pod endpoints.':
    '群集中的 ALB 控制器监视 Kubernetes 对象并配置网关，将 HTTP/HTTPS 流量直接转发到 Pod 终结点。',
  'The Azure portal — the browser-based management plane at portal.azure.com.':
    'Azure 门户：位于 portal.azure.com 的基于浏览器的管理平面。',
  'The NAT subnet must have enough free IP addresses for the number of connections.':
    'NAT 子网必须有足够的可用 IP 地址以支撑连接数量。',
  'The SDK can use direct mode, which opens additional TCP ports beyond 443, or gateway mode which uses 443 only.':
    'SDK 可使用直接模式（会在 443 之外开放额外的 TCP 端口）或网关模式（仅使用 443）。',
  'The backend must be behind a Standard SKU internal load balancer — Basic is not supported.':
    '后端必须位于标准 SKU 内部负载均衡器之后，不支持基本 SKU。',
  'The circuit carries one or more peerings. Private peering reaches your VNets; Microsoft peering reaches Microsoft public services such as Microsoft 365.':
    '线路承载一个或多个对等互连。专用对等互连可访问你的 VNet；Microsoft 对等互连可访问 Microsoft 365 等 Microsoft 公共服务。',
  'The client resolves a name through DNS, then connects to whatever public or private IP that name returns.':
    '客户端通过 DNS 解析名称，然后连接到该名称返回的公共或专用 IP。',
  'The end user or client device that starts the request.': '发起请求的最终用户或客户端设备。',
  'The function needs reachable storage; a blocked storage account stops the function starting at all.':
    '函数需要可访问的存储；存储帐户被阻止会导致函数根本无法启动。',
  'The gateway alone does nothing; the connection is what actually establishes and holds the tunnel or circuit link.':
    '仅有网关不起作用；真正建立并维持隧道或线路链接的是连接。',
  'The guest OS firewall is a separate layer from the NSG — Windows Firewall or iptables can block traffic the NSG allowed.':
    '来宾操作系统防火墙是独立于 NSG 的一层：Windows 防火墙或 iptables 可能阻止 NSG 已放行的流量。',
  'The plan is associated with a VNet, and every public IP in that VNet is then protected.':
    '该计划与某个 VNet 关联，之后该 VNet 中的每个公共 IP 都会受到保护。',
  'The public internet — traffic arriving from, or leaving to, addresses outside your network.':
    '公共 Internet：来自或发往你网络之外地址的流量。',
  'The subnet must be named exactly AzureBastionSubnet and be /26 or larger.':
    '该子网的名称必须正好是 AzureBastionSubnet，且大小为 /26 或更大。',
  'The target VM NSG must allow inbound 3389/22 FROM the Bastion subnet.':
    '目标虚拟机的 NSG 必须允许来自 Bastion 子网的 3389/22 入站流量。',
  'The user resolves your hostname to the closest edge POP. The edge applies WAF and caching rules, then forwards over the Microsoft backbone to the healthiest origin.':
    '用户将你的主机名解析到最近的边缘 POP。边缘节点应用 WAF 和缓存规则，然后通过 Microsoft 主干网转发到运行状况最佳的源站。',
  'This represents the customer network outside Azure — a corporate datacenter, branch office, or another cloud.':
    '这代表 Azure 之外的客户网络：企业数据中心、分支机构或另一朵云。',
  'Traffic Manager is DNS-based global load balancing — it answers DNS queries with the endpoint you should use.':
    '流量管理器是基于 DNS 的全球负载均衡：它在 DNS 应答中给出你应当使用的终结点。',
  'Traffic is steered to it with a UDR. For high availability it sits behind an internal load balancer, and its NIC must have IP forwarding enabled.':
    '流量通过 UDR 被引导到它。为实现高可用性，它位于内部负载均衡器之后，并且其 NIC 必须启用 IP 转发。',
  'Traffic is steered to it with a User-Defined Route pointing at its private IP. Rules are evaluated in order: DNAT, then network rules, then application rules.':
    '流量通过指向其专用 IP 的用户定义路由被引导过来。规则按顺序求值：先 DNAT，再网络规则，最后应用程序规则。',
  'Treat it like any other hop: confirm what it listens on, what it forwards to, and who controls its rules.':
    '把它当作其他任何跃点来对待：确认它侦听什么、转发到哪里，以及谁控制它的规则。',
  'Use Effective security rules on the NIC — that shows the merged subnet + NIC result, which is what actually applies.':
    '在 NIC 上使用“有效安全规则”：它显示子网与 NIC 合并后的结果，这才是实际生效的规则。',
  'Use effective routes on a workload NIC to prove the on-premises prefixes really arrived.':
    '在工作负载 NIC 上查看有效路由，以证明本地前缀确实已传达。',
  'Used as a generic actor when the exact device does not matter.':
    '当具体设备无关紧要时，作为通用参与者使用。',
  'VNet connections, VPN sites, and ExpressRoute circuits attach to the hub, and hub route tables control who can reach whom.':
    'VNet 连接、VPN 站点和 ExpressRoute 线路连接到中心，中心路由表控制谁能访问谁。',
  'VNet-deployed container groups need a delegated subnet.': '部署在 VNet 中的容器组需要委派子网。',
  'VNet-injected APIM requires specific inbound NSG rules; missing them makes the service unhealthy.':
    '注入到 VNet 的 APIM 需要特定的入站 NSG 规则；缺少这些规则会导致服务不正常。',
  'Verify the SKU supports the tunnel count and throughput you need.':
    '验证该 SKU 支持你所需的隧道数量和吞吐量。',
  'Verify the VNet address space does not overlap with any peered VNet or the on-premises network.':
    '验证 VNet 地址空间未与任何对等互连的 VNet 或本地网络重叠。',
  'Verify the downstream party has allow-listed the whole prefix, not one address from it.':
    '验证下游方已将整个前缀而不是其中某一个地址加入允许列表。',
  'Verify the target on-premises DNS server actually answers queries from the Azure source range.':
    '验证目标本地 DNS 服务器确实会响应来自 Azure 源地址范围的查询。',
  'Verify you have not hit a subscription-level quota (public IPs, VNet peerings, gateway count).':
    '验证你没有触及订阅级配额（公共 IP、VNet 对等互连、网关数量）。',
  'Virtual WAN is a managed networking service that provides a global transit hub-and-spoke backbone.':
    '虚拟 WAN 是一项托管网络服务，提供全球中转型中心辐射式主干网。',
  'Watch for overlapping address space between on-premises and the Azure VNet — that breaks routing.':
    '注意本地与 Azure VNet 之间的地址空间重叠，这会破坏路由。',
  'You assign NICs to the ASG, then reference the ASG as the source or destination in NSG rules.':
    '你将 NIC 分配到 ASG，然后在 NSG 规则中将该 ASG 作为源或目标引用。',
  'You create hubs per region and connect VNets, branches (VPN), and ExpressRoute circuits to them. Microsoft handles the any-to-any routing between hubs.':
    '你按区域创建中心，并将 VNet、分支（VPN）和 ExpressRoute 线路连接到中心。Microsoft 负责中心之间的任意到任意路由。',
  'You need it whenever traffic must take a path Azure would not choose on its own — for example forcing all egress through a firewall or NVA.':
    '当流量必须走 Azure 自身不会选择的路径时就需要它，例如强制所有出口流量经过防火墙或 NVA。',
  'Zone-redundant vs zonal matters for availability during a zone outage.':
    '区域冗余与单可用区在可用区故障期间的可用性方面有重要区别。',
};

const es: Dict = {
  'A 0.0.0.0/0 route with next hop None or a stale appliance IP blackholes all outbound traffic.':
    'Una ruta 0.0.0.0/0 con siguiente salto None o con la IP obsoleta de un dispositivo descarta silenciosamente todo el tráfico saliente.',
  'A 403 is authorisation (RBAC or access policy); a connection timeout is network.':
    'Un 403 es autorización (RBAC o directiva de acceso); un tiempo de espera de conexión es red.',
  'A 403 usually means authorisation or firewall; a name-resolution failure means DNS.':
    'Un 403 suele indicar autorización o firewall; un error de resolución de nombres indica DNS.',
  'A Connection is the resource that pairs an Azure gateway with the remote side — a Local Network Gateway, another VNet gateway, or an ExpressRoute circuit.':
    'Una conexión es el recurso que empareja una puerta de enlace de Azure con el lado remoto: una puerta de enlace de red local, otra puerta de enlace de VNet o un circuito de ExpressRoute.',
  'A DDoS Protection plan adds always-on traffic monitoring and adaptive mitigation for public IPs in protected VNets.':
    'Un plan de Protección contra DDoS añade supervisión continua del tráfico y mitigación adaptativa para las IP públicas de las VNet protegidas.',
  'A DNS zone holds the records that translate names into IP addresses. A Private DNS Zone is only visible to VNets that are linked to it.':
    'Una zona DNS contiene los registros que traducen nombres en direcciones IP. Una zona DNS privada solo es visible para las VNet vinculadas a ella.',
  'A Function App runs small pieces of event-driven code, billed by execution.':
    'Una aplicación de funciones ejecuta pequeños fragmentos de código controlado por eventos, con facturación por ejecución.',
  'A Local Network Gateway is the Azure object that describes your on-premises VPN device — its public IP and the prefixes behind it.':
    'Una puerta de enlace de red local es el objeto de Azure que describe su dispositivo VPN local: su IP pública y los prefijos que hay detrás.',
  'A NIC is the virtual network adapter that attaches a VM to a subnet and holds its private IP.':
    'Una NIC es el adaptador de red virtual que conecta una VM a una subred y contiene su IP privada.',
  'A Private DNS Zone is linked to one or more VNets. With auto-registration enabled, VMs in a linked VNet register their own records.':
    'Una zona DNS privada se vincula a una o varias VNet. Con el registro automático habilitado, las VM de una VNet vinculada registran sus propios registros.',
  'A Private Endpoint is a NIC in your subnet that holds a private IP mapped to a specific PaaS resource.':
    'Un punto de conexión privado es una NIC en su subred que contiene una IP privada asignada a un recurso PaaS concreto.',
  'A Public IP Prefix is a contiguous block of public addresses reserved for your subscription.':
    'Un prefijo de IP pública es un bloque contiguo de direcciones públicas reservado para su suscripción.',
  'A Public IP is an internet-routable address assigned to a gateway, load balancer, firewall, or VM NIC.':
    'Una IP pública es una dirección enrutable desde Internet asignada a una puerta de enlace, un equilibrador de carga, un firewall o una NIC de VM.',
  'A Scale Set manages an identical group of VMs that grows and shrinks automatically.':
    'Un conjunto de escalado gestiona un grupo idéntico de VM que crece y se reduce automáticamente.',
  'A Storage Account holds blobs, files, queues, and tables behind a public hostname per service.':
    'Una cuenta de almacenamiento contiene blobs, archivos, colas y tablas detrás de un nombre de host público por servicio.',
  'A VPN Gateway terminates encrypted IPsec/IKE tunnels between Azure and an on-premises device or remote user.':
    'Una puerta de enlace de VPN termina túneles cifrados IPsec/IKE entre Azure y un dispositivo local o un usuario remoto.',
  'A Virtual Machine is a server you run in Azure, with its own operating system and applications.':
    'Una máquina virtual es un servidor que se ejecuta en Azure, con su propio sistema operativo y sus aplicaciones.',
  'A Virtual Network is your private, isolated network in Azure, defined by one or more address ranges (CIDR blocks).':
    'Una red virtual es su red privada y aislada en Azure, definida por uno o varios intervalos de direcciones (bloques CIDR).',
  'A Virtual WAN hub is the Microsoft-managed regional hub VNet that spokes and branches connect into.':
    'Un centro de Virtual WAN es la VNet de centro regional administrada por Microsoft a la que se conectan los radios y las sucursales.',
  'A WAF policy is the rule set that inspects HTTP requests for common web attacks such as SQL injection and cross-site scripting.':
    'Una directiva de WAF es el conjunto de reglas que inspecciona las solicitudes HTTP en busca de ataques web comunes, como la inyección de SQL y el scripting entre sitios.',
  'A client application or device making the request.':
    'Una aplicación cliente o un dispositivo que realiza la solicitud.',
  'A command-line session such as PowerShell, Bash, or Azure CLI.':
    'Una sesión de línea de comandos como PowerShell, Bash o la CLI de Azure.',
  'A custom element added to represent something outside the standard Azure resource set.':
    'Un elemento personalizado añadido para representar algo ajeno al conjunto estándar de recursos de Azure.',
  'A legitimate request being blocked shows up as a 403 — check the WAF logs for the triggering rule ID and add an exclusion.':
    'Una solicitud legítima bloqueada aparece como un 403: revise los registros del WAF para localizar el identificador de la regla que se activó y añada una exclusión.',
  'A listener accepts the request on the front-end IP, a rule matches it, and the request is forwarded to a backend pool member that the health probe reports as healthy.':
    'Un agente de escucha acepta la solicitud en la IP de front-end, una regla la hace coincidir y la solicitud se reenvía a un miembro del grupo de back-end que el sondeo de estado considera correcto.',
  'A load-balancing rule maps a front-end IP and port to a backend pool and port. It does not inspect or modify the payload, so it cannot route by URL.':
    'Una regla de equilibrio de carga asigna una IP y un puerto de front-end a un grupo y un puerto de back-end. No inspecciona ni modifica la carga útil, por lo que no puede enrutar por URL.',
  'A missing or wrong prefix here is the single most common cause of "the tunnel is up but traffic does not pass".':
    'Un prefijo ausente o incorrecto aquí es, con diferencia, la causa más común de "el túnel está activo pero el tráfico no pasa".',
  'A mobile device acting as the client.': 'Un dispositivo móvil que actúa como cliente.',
  'A person or role involved in the flow.': 'Una persona o un rol implicado en el flujo.',
  'A portal error is control plane (ARM, RBAC, policy) — it is not evidence of a data-path problem.':
    'Un error del portal pertenece al plano de control (ARM, RBAC, directiva): no es prueba de un problema en la ruta de datos.',
  'A resource group is a logical container that holds related Azure resources.':
    'Un grupo de recursos es un contenedor lógico que agrupa recursos de Azure relacionados.',
  'A resource group is a management construct only — it does not affect network reachability. Two resources in different resource groups talk to each other normally.':
    'Un grupo de recursos es únicamente una construcción de administración: no afecta a la accesibilidad de red. Dos recursos en grupos distintos se comunican con normalidad.',
  'A route table holds User-Defined Routes that override the routes Azure creates by default.':
    'Una tabla de rutas contiene rutas definidas por el usuario que anulan las rutas que Azure crea de forma predeterminada.',
  'A server — typically an on-premises or third-party host outside Azure.':
    'Un servidor, normalmente un host local o de terceros fuera de Azure.',
  'A subnet is a slice of the VNet address space where resources actually get their IP addresses.':
    'Una subred es una porción del espacio de direcciones de la VNet donde los recursos obtienen realmente sus direcciones IP.',
  'A subscription is the billing and quota boundary that resources are created in.':
    'Una suscripción es el límite de facturación y de cuota dentro del cual se crean los recursos.',
  'A user laptop or workstation.': 'Un portátil o una estación de trabajo de usuario.',
  'AKS is managed Kubernetes — Azure runs the control plane and you run workloads in node pools.':
    'AKS es Kubernetes administrado: Azure ejecuta el plano de control y usted ejecuta las cargas de trabajo en grupos de nodos.',
  'API Management is a gateway that publishes, secures, and throttles APIs.':
    'API Management es una puerta de enlace que publica, protege y limita las API.',
  'Access can be restricted with the firewall and virtual network rules, or made fully private with a Private Endpoint per sub-resource (blob, file, and so on).':
    'El acceso se puede restringir con el firewall y las reglas de red virtual, o hacerse totalmente privado con un punto de conexión privado por subrecurso (blob, archivo, etc.).',
  'Admins usually reach resources through the Azure portal, Bastion, or a jump host rather than the application front door.':
    'Los administradores suelen llegar a los recursos a través del portal de Azure, Bastion o un host de salto, no por la puerta principal de la aplicación.',
  'An ASG is a label you attach to NICs so NSG rules can target a workload role instead of IP addresses.':
    'Un ASG es una etiqueta que se asocia a las NIC para que las reglas de NSG apunten a un rol de carga de trabajo en lugar de a direcciones IP.',
  'An Azure region is a set of datacenters in one geography that hosts your resources.':
    'Una región de Azure es un conjunto de centros de datos de una misma geografía que hospeda sus recursos.',
  'An ExpressRoute Gateway is the VNet-side endpoint that attaches a VNet to an ExpressRoute circuit.':
    'Una puerta de enlace de ExpressRoute es el punto de conexión del lado de la VNet que asocia una VNet a un circuito de ExpressRoute.',
  'An ExpressRoute circuit is a private Layer-3 connection between your network and Microsoft, provided by a connectivity partner.':
    'Un circuito de ExpressRoute es una conexión privada de capa 3 entre su red y Microsoft, proporcionada por un asociado de conectividad.',
  'An INBOUND endpoint gives on-premises an IP in Azure to forward queries to. An OUTBOUND endpoint plus a forwarding ruleset sends Azure queries for specific domains to on-premises DNS servers.':
    'Un punto de conexión de ENTRADA proporciona al entorno local una IP en Azure a la que reenviar consultas. Un punto de conexión de SALIDA junto con un conjunto de reglas de reenvío envía las consultas de Azure de dominios concretos a los servidores DNS locales.',
  'An IP Group is a named, reusable collection of IP addresses and ranges.':
    'Un grupo IP es una colección con nombre y reutilizable de direcciones e intervalos IP.',
  'An NSG and a route table are attached at the subnet level, so every resource in the subnet inherits those rules. Some services require a dedicated, specially-named subnet (for example GatewaySubnet, AzureFirewallSubnet, AzureBastionSubnet).':
    'Un NSG y una tabla de rutas se asocian en el nivel de subred, por lo que todos los recursos de la subred heredan esas reglas. Algunos servicios requieren una subred dedicada con un nombre concreto (por ejemplo, GatewaySubnet, AzureFirewallSubnet, AzureBastionSubnet).',
  'An NSG is a stateful packet filter with allow and deny rules based on source, destination, port, and protocol.':
    'Un NSG es un filtro de paquetes con estado, con reglas de permiso y denegación basadas en origen, destino, puerto y protocolo.',
  'An NVA is a third-party firewall, router, or proxy running as a VM inside your VNet.':
    'Un NVA es un firewall, enrutador o proxy de terceros que se ejecuta como VM dentro de su VNet.',
  'An administrator performing management or troubleshooting work.':
    'Un administrador que realiza tareas de administración o de solución de problemas.',
  'An image pull failure over Private Link is nearly always DNS — verify the registry name resolves to the private IP.':
    'Un error al extraer una imagen a través de Private Link casi siempre es de DNS: compruebe que el nombre del registro se resuelve en la IP privada.',
  'App Service is a managed platform for hosting web apps and APIs without managing servers.':
    'App Service es una plataforma administrada para hospedar aplicaciones web y API sin administrar servidores.',
  'Application Gateway for Containers is the Kubernetes-native Layer-7 ingress built on the Application Gateway platform.':
    'Application Gateway for Containers es la entrada de capa 7 nativa de Kubernetes creada sobre la plataforma de Application Gateway.',
  'Application Gateway is a regional Layer-7 (HTTP/HTTPS) load balancer.':
    'Application Gateway es un equilibrador de carga regional de capa 7 (HTTP/HTTPS).',
  'Application rules need the FQDN; if the client resolves DNS differently, the rule will not match.':
    'Las reglas de aplicación necesitan el FQDN; si el cliente resuelve el DNS de otra forma, la regla no coincidirá.',
  'Asymmetric routing is a classic failure — the return path must also traverse the firewall.':
    'El enrutamiento asimétrico es un fallo clásico: la ruta de retorno también debe atravesar el firewall.',
  'Azure Bastion is a managed jump host that gives browser-based RDP and SSH access to VMs.':
    'Azure Bastion es un host de salto administrado que ofrece acceso RDP y SSH a las VM desde el explorador.',
  'Azure Container Registry stores and serves your container images.':
    'Azure Container Registry almacena y sirve sus imágenes de contenedor.',
  'Azure Firewall is a managed, stateful network firewall that inspects traffic against DNAT, network, and application rules.':
    'Azure Firewall es un firewall de red administrado y con estado que inspecciona el tráfico frente a reglas DNAT, de red y de aplicación.',
  'Azure Firewall rules reference the IP Group by name in the source or destination field.':
    'Las reglas de Azure Firewall hacen referencia al grupo IP por su nombre en el campo de origen o de destino.',
  'Azure Load Balancer is a Layer-4 (TCP/UDP) load balancer that spreads connections across a backend pool.':
    'Azure Load Balancer es un equilibrador de carga de capa 4 (TCP/UDP) que reparte las conexiones entre un grupo de back-end.',
  'Azure SQL Database is a managed relational database service.':
    'Azure SQL Database es un servicio de base de datos relacional administrado.',
  'Azure needs to know which address ranges live on the far side of the tunnel so it can route to them.':
    'Azure necesita saber qué intervalos de direcciones se encuentran al otro lado del túnel para poder enrutar hacia ellos.',
  'Azure protects its platform by default, but a Network Protection plan tunes mitigation to YOUR traffic and adds attack telemetry plus cost protection.':
    'Azure protege su plataforma de forma predeterminada, pero un plan de protección de red ajusta la mitigación a SU tráfico y añade telemetría de ataques y protección de costes.',
  'Because it is DNS-based, client-side DNS caching and TTL delay failover — check the TTL.':
    'Al estar basado en DNS, la caché de DNS del cliente y el TTL retrasan la conmutación por error: revise el TTL.',
  'Both the source and destination ASG must be in the SAME virtual network for a rule to work.':
    'Para que una regla funcione, el ASG de origen y el de destino deben estar en la MISMA red virtual.',
  'Caching can mask a backend change — purge before concluding the backend is wrong.':
    'La caché puede ocultar un cambio en el back-end: vacíela antes de concluir que el back-end es incorrecto.',
  'Capture the exact command and full error text — it usually names the failing endpoint and port.':
    'Capture el comando exacto y el texto completo del error: normalmente indica el punto de conexión y el puerto que fallan.',
  'Check BGP session state and the advertised/received route counts on each peering.':
    'Compruebe el estado de la sesión BGP y el número de rutas anunciadas y recibidas en cada emparejamiento.',
  'Check DDoS mitigation metrics before assuming an outage is application-side.':
    'Revise las métricas de mitigación de DDoS antes de dar por supuesto que la interrupción es del lado de la aplicación.',
  'Check SNAT port utilisation metrics if outbound connections start failing intermittently.':
    'Revise las métricas de uso de puertos SNAT si las conexiones salientes empiezan a fallar de forma intermitente.',
  'Check backend health first — an unhealthy pool returns 502.':
    'Compruebe primero el estado del back-end: un grupo en mal estado devuelve 502.',
  'Check connection status and the ingress/egress byte counters — zero bytes with a Connected state points at routing, not the tunnel.':
    'Compruebe el estado de la conexión y los contadores de bytes de entrada y salida: cero bytes con estado Conectado apunta al enrutamiento, no al túnel.',
  'Check container logs and restart count first — an app crash looks like a network failure from outside.':
    'Revise primero los registros del contenedor y el número de reinicios: desde fuera, un bloqueo de la aplicación parece un fallo de red.',
  'Check effective routes and effective security rules on the NIC.':
    'Consulte las rutas efectivas y las reglas de seguridad efectivas en la NIC.',
  'Check effective routes on a NIC in this VNet to see what next hop Azure is actually using.':
    'Consulte las rutas efectivas de una NIC de esta VNet para ver qué siguiente salto está usando Azure realmente.',
  'Check effective routes on the NIC — that is the ground truth, not the route table definition.':
    'Consulte las rutas efectivas en la NIC: esa es la realidad, no la definición de la tabla de rutas.',
  'Check endpoint monitor status; an endpoint marked Degraded is removed from responses.':
    'Compruebe el estado de supervisión del punto de conexión; un punto marcado como Degradado se elimina de las respuestas.',
  'Check for a delete lock or Azure Policy assignment at this scope if a deployment is failing.':
    'Si una implementación falla, compruebe si hay un bloqueo de eliminación o una asignación de Azure Policy en este ámbito.',
  'Check for asymmetric routing — both directions must traverse the same appliance instance.':
    'Compruebe si hay enrutamiento asimétrico: ambos sentidos deben atravesar la misma instancia del dispositivo.',
  'Check health probe status — if every instance is unhealthy the load balancer silently drops traffic.':
    'Compruebe el estado del sondeo de estado: si todas las instancias están en mal estado, el equilibrador de carga descarta el tráfico en silencio.',
  'Check hub routing status and the effective routes for the connection in question.':
    'Compruebe el estado de enrutamiento del centro y las rutas efectivas de la conexión en cuestión.',
  'Check origin health probes and the origin host header setting — a mismatch causes 4xx from the origin.':
    'Revise los sondeos de estado del origen y la configuración del encabezado de host de origen: una discrepancia provoca errores 4xx desde el origen.',
  'Check priority ordering — a broad deny in a parent policy silently overrides a child allow.':
    'Revise el orden de prioridad: una denegación amplia en una directiva primaria anula silenciosamente un permiso de una directiva secundaria.',
  'Check that the on-premises prefixes are present in the Local Network Gateway (or advertised via BGP).':
    'Compruebe que los prefijos locales estén presentes en la puerta de enlace de red local (o se anuncien mediante BGP).',
  'Check that the on-premises router actually advertises the local prefixes, and that it learns the Azure address space.':
    'Compruebe que el enrutador local anuncia realmente los prefijos locales y que aprende el espacio de direcciones de Azure.',
  'Check the A record exists and points at the expected IP.':
    'Compruebe que el registro A existe y apunta a la IP esperada.',
  'Check the ALB controller pod logs in the cluster.':
    'Revise los registros del pod del controlador de ALB en el clúster.',
  'Check the NSG attached to this subnet — subnet rules are evaluated before NIC rules for inbound traffic.':
    'Revise el NSG asociado a esta subred: para el tráfico de entrada, las reglas de subred se evalúan antes que las de NIC.',
  'Check the connection state is Approved, not Pending.':
    'Compruebe que el estado de la conexión sea Aprobado y no Pendiente.',
  'Check the default rules — DenyAllInbound at priority 65500 catches anything you did not explicitly allow.':
    'Revise las reglas predeterminadas: DenyAllInbound, con prioridad 65500, captura todo lo que no haya permitido explícitamente.',
  'Check the effective routes on the hub route table, not just on the spoke.':
    'Consulte las rutas efectivas en la tabla de rutas del centro, no solo en el radio.',
  'Check the firewall logs for the specific flow — they tell you which rule allowed or denied it.':
    'Revise los registros del firewall para ese flujo concreto: indican qué regla lo permitió o lo denegó.',
  'Check the forwarding ruleset is linked to the VNet, and that the rule domain name ends with a trailing dot.':
    'Compruebe que el conjunto de reglas de reenvío esté vinculado a la VNet y que el nombre de dominio de la regla termine con un punto final.',
  'Check the number of routes learned — exceeding the route limit drops the BGP session.':
    'Compruebe el número de rutas aprendidas: superar el límite de rutas hace caer la sesión BGP.',
  'Check the policy trace for the failing call — the answer is usually a policy, not the network.':
    'Revise el seguimiento de directivas de la llamada que falla: la respuesta suele estar en una directiva, no en la red.',
  'Check the route on the server itself — it must know to send the Azure prefixes to the tunnel.':
    'Revise la ruta en el propio servidor: debe saber que ha de enviar los prefijos de Azure al túnel.',
  'Check the route table attached to this subnet for a UDR that overrides the default system route.':
    'Revise la tabla de rutas asociada a esta subred por si hay una UDR que anule la ruta del sistema predeterminada.',
  'Check the service is actually available in this region (some SKUs are region-limited).':
    'Compruebe que el servicio esté realmente disponible en esta región (algunas SKU están limitadas por región).',
  'Check the service type — ClusterIP is cluster-internal only, LoadBalancer creates an Azure load balancer.':
    'Compruebe el tipo de servicio: ClusterIP es solo interno del clúster, mientras que LoadBalancer crea un equilibrador de carga de Azure.',
  'Check what the client resolves the name to, and from which network it is connecting.':
    'Compruebe en qué resuelve el cliente el nombre y desde qué red se está conectando.',
  'Check whether Access Restrictions are blocking the caller.':
    'Compruebe si las restricciones de acceso están bloqueando al llamador.',
  'Check whether the client is on the corporate network, on VPN, or on the public internet, because the path differs.':
    'Compruebe si el cliente está en la red corporativa, en la VPN o en Internet público, porque la ruta es distinta en cada caso.',
  'Check whether unhealthy instances are being rolled — an instance can be up but failing its probe.':
    'Compruebe si se están reemplazando instancias en mal estado: una instancia puede estar activa y aun así no superar su sondeo.',
  'Circuits are redundant by design — verify BOTH links, not just the primary.':
    'Los circuitos son redundantes por diseño: verifique AMBOS enlaces, no solo el principal.',
  'Client-side caching can hide a fix — flush the resolver cache before retesting.':
    'La caché del cliente puede ocultar una corrección: vacíe la caché del solucionador antes de volver a probar.',
  'Compare a lookup and a connection test from the laptop against the same test run inside Azure.':
    'Compare una resolución de nombres y una prueba de conexión desde el portátil con la misma prueba ejecutada dentro de Azure.',
  'Compare the IPsec policy on this connection with the on-premises configuration line by line.':
    'Compare línea por línea la directiva IPsec de esta conexión con la configuración local.',
  'Compute platforms need somewhere private and close to pull images from at deployment time.':
    'Las plataformas de proceso necesitan un lugar privado y cercano desde el que extraer imágenes en el momento de la implementación.',
  'Confirm IP forwarding is enabled if this NIC belongs to an NVA that must route traffic for others.':
    'Confirme que el reenvío IP está habilitado si esta NIC pertenece a un NVA que debe enrutar tráfico para otros.',
  'Confirm a UDR actually forces the traffic through the firewall; without it traffic bypasses the firewall entirely.':
    'Confirme que una UDR obliga realmente al tráfico a pasar por el firewall; sin ella, el tráfico lo evita por completo.',
  'Confirm a virtual network link exists between the zone and the client VNet — without it the zone is invisible.':
    'Confirme que existe un vínculo de red virtual entre la zona y la VNet del cliente: sin él, la zona es invisible.',
  'Confirm backend certificate validation settings if the backend uses a private CA.':
    'Confirme la configuración de validación del certificado de back-end si el back-end usa una entidad de certificación privada.',
  'Confirm both sides of the flow are in the region you expect — cross-region hops add latency and egress charges.':
    'Confirme que ambos extremos del flujo están en la región prevista: los saltos entre regiones añaden latencia y cargos de salida.',
  'Confirm the NIC really is a member — an unassigned NIC silently falls through to the deny rule.':
    'Confirme que la NIC es realmente miembro: una NIC sin asignar acaba silenciosamente en la regla de denegación.',
  'Confirm the NSG on the Application Gateway subnet allows the required inbound ports from the GatewayManager service tag.':
    'Confirme que el NSG de la subred de Application Gateway permite los puertos de entrada necesarios desde la etiqueta de servicio GatewayManager.',
  'Confirm the NSG on the backend NICs or subnet allows the probe source (AzureLoadBalancer service tag) and the data port.':
    'Confirme que el NSG de las NIC de back-end o de la subred permite el origen del sondeo (etiqueta de servicio AzureLoadBalancer) y el puerto de datos.',
  'Confirm the Private DNS Zone is linked to the VNet the client sits in, and that the A record exists.':
    'Confirme que la zona DNS privada está vinculada a la VNet en la que se encuentra el cliente y que el registro A existe.',
  'Confirm the UDR next hop points at the NVA private IP (or the internal load balancer front end for an HA pair).':
    'Confirme que el siguiente salto de la UDR apunta a la IP privada del NVA (o al front-end del equilibrador de carga interno si se trata de un par de alta disponibilidad).',
  'Confirm the VNet DNS setting (Azure-provided vs custom DNS servers) matches what the workload expects.':
    'Confirme que la configuración de DNS de la VNet (DNS proporcionado por Azure frente a servidores DNS personalizados) coincide con lo que espera la carga de trabajo.',
  'Confirm the VNet connection propagates to, and associates with, the route tables you expect.':
    'Confirme que la conexión de VNet se propaga a las tablas de rutas previstas y se asocia con ellas.',
  'Confirm the VNet is actually associated with the plan.':
    'Confirme que la VNet está realmente asociada al plan.',
  'Confirm the address is actually associated with the resource you think it is.':
    'Confirme que la dirección está realmente asociada al recurso que usted cree.',
  'Confirm the address you expect is really in the group — a missing entry looks exactly like a firewall deny.':
    'Confirme que la dirección esperada está realmente en el grupo: una entrada ausente se parece exactamente a una denegación del firewall.',
  'Confirm the admin path (Bastion, VPN, or portal) separately — it can fail while the app path works.':
    'Compruebe la ruta de administración (Bastion, VPN o portal) por separado: puede fallar mientras la ruta de la aplicación funciona.',
  'Confirm the application is actually listening on the expected port (netstat or ss).':
    'Confirme que la aplicación está escuchando realmente en el puerto esperado (netstat o ss).',
  'Confirm the association subnet is delegated correctly and has free addresses.':
    'Confirme que la subred de asociación está delegada correctamente y tiene direcciones libres.',
  'Confirm the circuit status is Provisioned and the peering is configured on both the provider and Microsoft side.':
    'Confirme que el estado del circuito es Aprovisionado y que el emparejamiento está configurado tanto en el lado del proveedor como en el de Microsoft.',
  'Confirm the consumer connection request has been approved.':
    'Confirme que se ha aprobado la solicitud de conexión del consumidor.',
  'Confirm the gateway SKU supports the required throughput and the number of circuit connections.':
    'Confirme que la SKU de la puerta de enlace admite el rendimiento necesario y el número de conexiones de circuito.',
  'Confirm the local firewall and any host-based firewall permit the flow in both directions.':
    'Confirme que el firewall local y cualquier firewall basado en host permiten el flujo en ambos sentidos.',
  'Confirm the on-premises conditional forwarder points at the inbound endpoint IP, and that UDP and TCP port 53 are open across the tunnel.':
    'Confirme que el reenviador condicional local apunta a la IP del punto de conexión de entrada y que el puerto 53 UDP y TCP está abierto a través del túnel.',
  'Confirm the on-premises firewall permits the required ports in BOTH directions.':
    'Confirme que el firewall local permite los puertos necesarios en AMBOS sentidos.',
  'Confirm the origin only accepts traffic from Front Door (X-Azure-FDID header or the AzureFrontDoor.Backend service tag).':
    'Confirme que el origen solo acepta tráfico procedente de Front Door (encabezado X-Azure-FDID o etiqueta de servicio AzureFrontDoor.Backend).',
  'Confirm the hosting plan supports the networking feature you need — the classic Consumption plan has no VNet integration, while Flex Consumption and Premium do.': 'Confirme que el plan de hospedaje admite la característica de red que necesita: el plan Consumption clásico no tiene integración con VNet, mientras que Flex Consumption y Premium sí.',
  'Confirm the policy is actually associated with the firewall handling this traffic.':
    'Confirme que la directiva está realmente asociada al firewall que gestiona este tráfico.',
  'Confirm the public IP matches the on-premises device address seen from the internet after NAT.':
    'Confirme que la IP pública coincide con la dirección del dispositivo local vista desde Internet después de NAT.',
  'Confirm the pulling identity has the AcrPull role.':
    'Confirme que la identidad que realiza la extracción tiene el rol AcrPull.',
  'Confirm the server firewall rules or Private Endpoint permit the client.':
    'Confirme que las reglas de firewall del servidor o el punto de conexión privado permiten al cliente.',
  'Confirm the subnet has enough free addresses for the maximum pods per node under Azure CNI.':
    'Confirme que la subred tiene suficientes direcciones libres para el número máximo de pods por nodo con Azure CNI.',
  'Confirm the subnet is large enough — Azure reserves 5 addresses in every subnet.':
    'Confirme que la subred es lo bastante grande: Azure reserva 5 direcciones en cada subred.',
  'Confirm the tunnel is Connected, not just Provisioned.':
    'Confirme que el túnel está Conectado, no solo Aprovisionado.',
  'Confirm the upgrade policy is not mid-rollout when investigating inconsistent behaviour.':
    'Al investigar un comportamiento inconsistente, confirme que la directiva de actualización no está a mitad de una implantación.',
  'Confirm what the client actually resolves the name to — a wrong DNS answer sends traffic to the wrong place.':
    'Confirme en qué resuelve realmente el cliente el nombre: una respuesta DNS incorrecta envía el tráfico al lugar equivocado.',
  'Confirm whether the policy is in Detection or Prevention mode before concluding it is not the cause.':
    'Confirme si la directiva está en modo Detección o Prevención antes de concluir que no es la causa.',
  'Consumers create a Private Endpoint that requests a connection; you approve it. Traffic arrives with the source NAT applied by the platform.':
    'Los consumidores crean un punto de conexión privado que solicita una conexión y usted la aprueba. El tráfico llega con el NAT de origen aplicado por la plataforma.',
  'Container Instances runs a single container without any cluster to manage.':
    'Container Instances ejecuta un único contenedor sin ningún clúster que administrar.',
  'Cosmos DB is a globally distributed NoSQL database with low-latency reads and writes.':
    'Cosmos DB es una base de datos NoSQL distribuida globalmente con lecturas y escrituras de baja latencia.',
  'Cross-subscription peering and Private Link need permissions in BOTH subscriptions.':
    'El emparejamiento entre suscripciones y Private Link requieren permisos en AMBAS suscripciones.',
  'Customers use one when they need a specific vendor feature set, or want the same appliance on-premises and in Azure.':
    'Los clientes lo usan cuando necesitan un conjunto de características de un proveedor concreto o quieren el mismo dispositivo en el entorno local y en Azure.',
  'DNS Private Resolver is a managed service that resolves DNS between on-premises and Azure without you running DNS server VMs.':
    'DNS Private Resolver es un servicio administrado que resuelve DNS entre el entorno local y Azure sin que tenga que ejecutar VM de servidor DNS.',
  'DNS is the number-one cause of failure — run a lookup from the client and confirm it returns the private IP, not the public one.':
    'El DNS es la causa de error número uno: haga una resolución desde el cliente y confirme que devuelve la IP privada, no la pública.',
  'Direct mode needs TCP 10250-10255 and 10000-20000 open; gateway mode only needs 443.':
    'El modo directo necesita abiertos los puertos TCP 10250-10255 y 10000-20000; el modo de puerta de enlace solo necesita el 443.',
  'Each sub-resource needs its OWN Private Endpoint and its own privatelink DNS zone.':
    'Cada subrecurso necesita SU PROPIO punto de conexión privado y su propia zona DNS privatelink.',
  'Effective routes and effective security rules are both read from the NIC — always start here.':
    'Tanto las rutas efectivas como las reglas de seguridad efectivas se leen desde la NIC: empiece siempre por aquí.',
  'Enable VNet flow logs for a historical record of allow and deny decisions.':
    'Habilite los registros de flujo de VNet para disponer de un histórico de las decisiones de permiso y denegación.',
  'Every traffic flow needs an origin — this is the person or application whose experience you are troubleshooting.':
    'Todo flujo de tráfico necesita un origen: es la persona o la aplicación cuya experiencia está investigando.',
  'Everything drawn inside this boundary is deployed in the same region, so traffic between those resources stays on the regional network rather than crossing the internet.':
    'Todo lo dibujado dentro de este límite se implementa en la misma región, por lo que el tráfico entre esos recursos permanece en la red regional en lugar de atravesar Internet.',
  'Firewall Policy is the reusable rule container that one or more Azure Firewalls apply.':
    'La directiva de firewall es el contenedor de reglas reutilizable que aplican uno o varios Azure Firewall.',
  'For Private Endpoints, the zone name must match the required pattern exactly (for example privatelink.blob.core.windows.net).':
    'Para los puntos de conexión privados, el nombre de la zona debe coincidir exactamente con el patrón requerido (por ejemplo, privatelink.blob.core.windows.net).',
  'For Standard SKU, remember inbound is closed by default until an NSG rule opens it.':
    'Con la SKU Estándar, recuerde que la entrada está cerrada de forma predeterminada hasta que una regla de NSG la abre.',
  'For TLS errors, check certificate expiry, chain, and whether the backend hostname matches the certificate.':
    'Para los errores de TLS, compruebe la caducidad del certificado, la cadena y si el nombre de host del back-end coincide con el certificado.',
  'For an internal load balancer, confirm the client is on a network that can reach the private front-end IP.':
    'En un equilibrador de carga interno, confirme que el cliente está en una red que puede alcanzar la IP privada de front-end.',
  'For inbound: confirm the public IP, the NSG allow rule, and the health of the backend.':
    'Para la entrada: confirme la IP pública, la regla de permiso del NSG y el estado del back-end.',
  'For outbound VNet integration, WEBSITE_DNS_SERVER and route-all settings decide whether traffic uses VNet DNS and routes.':
    'En la integración de VNet de salida, la configuración WEBSITE_DNS_SERVER y route-all determina si el tráfico usa el DNS y las rutas de la VNet.',
  'For outbound: confirm an explicit method exists — a NAT Gateway, a load balancer outbound rule, or a public IP on the NIC. Default outbound access was retired on 30 September 2025, so a new VM without one of these has no internet access at all.': 'Para la salida: confirme que existe un método explícito — una NAT Gateway, una regla de salida del balanceador de carga o una IP pública en la NIC. El acceso de salida predeterminado se retiró el 30 de septiembre de 2025, por lo que una VM nueva sin ninguno de ellos no tiene acceso a Internet.',
  'Front Door is a global Layer-7 entry point with content delivery and WAF built in.':
    'Front Door es un punto de entrada global de capa 7 con entrega de contenido y WAF integrados.',
  'Gateway, Firewall, and Bastion subnets must use their exact reserved names or deployment fails.':
    'Las subredes de puerta de enlace, firewall y Bastion deben usar exactamente sus nombres reservados o la implementación fallará.',
  'Hybrid flows depend on it, and it is frequently the piece nobody has console access to during a call.':
    'Los flujos híbridos dependen de él y, a menudo, es la pieza a cuya consola nadie tiene acceso durante una llamada.',
  'IKE phase 1/2 settings, PSK, and the IPsec policy must match EXACTLY on both ends.':
    'La configuración de las fases 1 y 2 de IKE, la clave precompartida y la directiva IPsec deben coincidir EXACTAMENTE en ambos extremos.',
  'IP forwarding must be enabled on the NVA NIC in Azure AND inside the guest OS.':
    'El reenvío IP debe estar habilitado en la NIC del NVA en Azure Y dentro del sistema operativo invitado.',
  'If the account firewall is set to selected networks, confirm the caller subnet or IP is listed.':
    'Si el firewall de la cuenta está configurado como redes seleccionadas, confirme que la subred o la IP del llamador figura en la lista.',
  'If the firewall is restricted, confirm the caller network or the trusted-services exception is allowed.':
    'Si el firewall está restringido, confirme que se permite la red del llamador o la excepción de servicios de confianza.',
  'Inbound and outbound are configured independently — confirm which direction is failing.':
    'La entrada y la salida se configuran de forma independiente: confirme cuál de los dos sentidos falla.',
  'Inbound and outbound endpoints each need their own delegated subnet.':
    'Los puntos de conexión de entrada y de salida necesitan cada uno su propia subred delegada.',
  'Inbound internet traffic lands on a public IP attached to a gateway, load balancer, or VM. Outbound traffic leaves through a NAT Gateway, a load balancer, or a firewall.':
    'El tráfico entrante de Internet llega a una IP pública asociada a una puerta de enlace, un equilibrador de carga o una VM. El tráfico saliente sale a través de una NAT Gateway, un equilibrador de carga o un firewall.',
  'Inbound private access uses a Private Endpoint. Outbound access into a VNet uses regional VNet integration — the two are separate features.':
    'El acceso privado entrante usa un punto de conexión privado. El acceso saliente hacia una VNet usa la integración regional con VNet: son dos características distintas.',
  'Individual public IPs are then allocated from the prefix and assigned to resources such as a NAT Gateway or load balancer.':
    'Después se asignan IP públicas individuales a partir del prefijo y se atribuyen a recursos como una NAT Gateway o un equilibrador de carga.',
  'Instances share one network configuration and normally sit in a load balancer or Application Gateway backend pool.':
    'Las instancias comparten una única configuración de red y normalmente se encuentran en el grupo de back-end de un equilibrador de carga o de Application Gateway.',
  'It answers "is this being blocked, and by what?" with data instead of guesswork.':
    'Responde con datos, en lugar de conjeturas, a la pregunta "¿esto se está bloqueando y con qué?".',
  'It attaches to Application Gateway or Front Door and runs in Detection mode (log only) or Prevention mode (block).':
    'Se asocia a Application Gateway o a Front Door y se ejecuta en modo Detección (solo registro) o en modo Prevención (bloqueo).',
  'It attaches to a subnet, a NIC, or both. Rules are evaluated by priority, lowest number first, and the first match wins. Because it is stateful, return traffic for an allowed flow is permitted automatically.':
    'Se asocia a una subred, a una NIC o a ambas. Las reglas se evalúan por prioridad, empezando por el número más bajo, y gana la primera coincidencia. Al tener estado, el tráfico de retorno de un flujo permitido se admite automáticamente.',
  'It attaches to a subnet. Azure picks the most specific matching prefix; if two routes tie, a UDR beats a BGP route, which beats a system route.':
    'Se asocia a una subred. Azure elige el prefijo coincidente más específico; si dos rutas empatan, una UDR gana a una ruta BGP, y esta a una ruta del sistema.',
  'It attaches to one or more subnets. Once attached, it takes priority over all other outbound methods for those subnets. It never allows unsolicited inbound traffic.':
    'Se asocia a una o varias subredes. Una vez asociada, tiene prioridad sobre todos los demás métodos de salida de esas subredes. Nunca permite tráfico entrante no solicitado.',
  'It avoids the public internet entirely, giving predictable latency, higher bandwidth, and an SLA.':
    'Evita por completo Internet público, lo que proporciona una latencia predecible, mayor ancho de banda y un SLA.',
  'It blocks application-layer attacks that a Layer-4 firewall or NSG cannot see, because those only look at IP and port.':
    'Bloquea ataques de capa de aplicación que un firewall de capa 4 o un NSG no pueden ver, porque estos solo examinan la IP y el puerto.',
  'It can be deployed into a VNet subnet for private access, or given a public IP for direct access.':
    'Se puede implementar en una subred de VNet para acceso privado, o asignarle una IP pública para acceso directo.',
  'It can be external (public front end) or internal (VNet-only). In VNet mode it has strict required NSG rules and dependency endpoints.':
    'Puede ser externo (front-end público) o interno (solo VNet). En modo VNet tiene reglas de NSG obligatorias estrictas y puntos de conexión de dependencia.',
  'It can be reached publicly, or privately through a Private Endpoint with the matching Private DNS Zone.':
    'Se puede alcanzar públicamente o de forma privada mediante un punto de conexión privado con la zona DNS privada correspondiente.',
  'It cannot be used for inbound; if inbound is needed, that is a separate load balancer or public IP.':
    'No se puede usar para tráfico entrante; si se necesita entrada, hace falta un equilibrador de carga o una IP pública aparte.',
  'It carries the shared key, the IPsec/IKE policy, and the BGP setting for that specific link.':
    'Contiene la clave compartida, la directiva IPsec/IKE y la configuración de BGP de ese vínculo concreto.',
  'It centralises egress control and logging, so one policy governs what an entire hub-and-spoke estate is allowed to reach.':
    'Centraliza el control y el registro de la salida, de modo que una sola directiva rige a qué puede acceder todo un entorno de tipo centro y radio.',
  'It clarifies who experiences the behaviour being described.':
    'Aclara quién experimenta el comportamiento que se describe.',
  'It connects from the office LAN, from home, or through a VPN client, and each path resolves DNS differently.':
    'Se conecta desde la LAN de la oficina, desde casa o mediante un cliente VPN, y cada ruta resuelve el DNS de forma distinta.',
  'It connects over the public internet unless a VPN profile is applied.':
    'Se conecta a través de Internet público salvo que se aplique un perfil de VPN.',
  'It connects to Azure through a Site-to-Site VPN tunnel or an ExpressRoute circuit. Routes are exchanged either statically or via BGP.':
    'Se conecta a Azure mediante un túnel VPN de sitio a sitio o un circuito de ExpressRoute. Las rutas se intercambian de forma estática o mediante BGP.',
  'It connects to a subnet through a NIC. Its reachability is governed by the NSG on that NIC and on the subnet, plus the guest OS firewall.':
    'Se conecta a una subred mediante una NIC. Su accesibilidad la determinan el NSG de esa NIC y el de la subred, además del firewall del sistema operativo invitado.',
  'It gives container workloads scheduling, self-healing, and scaling without you operating Kubernetes masters.':
    'Ofrece a las cargas de trabajo en contenedores programación, autorreparación y escalado sin que usted opere maestros de Kubernetes.',
  'It gives one consistent front door for many backends, with authentication, rate limiting, and transformation applied by policy.':
    'Ofrece una puerta de entrada única y coherente para muchos back-end, con autenticación, limitación de velocidad y transformación aplicadas mediante directivas.',
  'It gives you a predictable, unchanging range so partners and firewalls can allow-list your egress addresses once.':
    'Le proporciona un intervalo predecible e invariable para que los asociados y los firewalls incluyan sus direcciones de salida en la lista de permitidos una sola vez.',
  'It gives you a stable, known egress address and a very large pool of SNAT ports, which prevents the port-exhaustion failures common with default outbound access.':
    'Le proporciona una dirección de salida estable y conocida y un conjunto muy amplio de puertos SNAT, lo que evita los errores por agotamiento de puertos habituales con el acceso saliente predeterminado.',
  'It gives you private connectivity into the VNet over the public internet, without exposing resources publicly.':
    'Le proporciona conectividad privada hacia la VNet a través de Internet público, sin exponer recursos públicamente.',
  'It gives your resources private IP addresses and a security boundary, so they can talk to each other privately instead of over the public internet.':
    'Proporciona a sus recursos direcciones IP privadas y un límite de seguridad, de modo que puedan comunicarse entre sí de forma privada en lugar de a través de Internet público.',
  'It groups resources with a shared lifecycle so they can be deployed, permissioned, and deleted together.':
    'Agrupa recursos con un ciclo de vida común para que se puedan implementar, autorizar y eliminar en conjunto.',
  'It handles scale and instance repair for you, so capacity follows demand without manual VM creation.':
    'Se encarga por usted del escalado y la reparación de instancias, de modo que la capacidad siga a la demanda sin crear VM manualmente.',
  'It injects the routes learned from on-premises into the VNet and forwards traffic onto the private circuit.':
    'Inyecta en la VNet las rutas aprendidas del entorno local y reenvía el tráfico al circuito privado.',
  'It is deployed into a dedicated AzureBastionSubnet. The admin connects to the Azure portal over TLS, and Bastion opens the RDP or SSH session to the VM private IP.':
    'Se implementa en una subred AzureBastionSubnet dedicada. El administrador se conecta al portal de Azure mediante TLS y Bastion abre la sesión RDP o SSH hacia la IP privada de la VM.',
  'It is enabled per region. IP flow verify names the exact NSG rule that allowed or denied a flow; next hop shows where a packet would actually be routed.':
    'Se habilita por región. La verificación de flujo IP indica la regla de NSG exacta que permitió o denegó un flujo; el siguiente salto muestra hacia dónde se enrutaría realmente un paquete.',
  'It is reached over HTTPS. It can be locked down with firewall rules or a Private Endpoint, and callers usually authenticate with a managed identity.':
    'Se accede a él mediante HTTPS. Se puede restringir con reglas de firewall o un punto de conexión privado, y los llamadores suelen autenticarse con una identidad administrada.',
  'It is reached over TCP 1433. The connection policy is Redirect (which also needs ports 11000-11999) or Proxy (1433 only).':
    'Se accede a él mediante TCP 1433. La directiva de conexión es Redirect (que además necesita los puertos 11000-11999) o Proxy (solo 1433).',
  'It is referenced by a Connection resource, which pairs it with the Azure VPN Gateway. With BGP, the prefix list is learned dynamically instead.':
    'Un recurso de conexión hace referencia a él y lo empareja con la puerta de enlace de VPN de Azure. Con BGP, la lista de prefijos se aprende dinámicamente.',
  'It is the basic segmentation control in Azure, but it does not deny by default: the built-in AllowVNetInBound rule already permits all traffic inside the virtual network, so segmentation starts only when you add your own higher-priority deny.': 'Es el control de segmentación básico de Azure, pero no deniega de forma predeterminada: la regla integrada AllowVNetInBound ya permite todo el tráfico dentro de la red virtual, así que la segmentación solo empieza cuando agrega su propia regla de denegación con mayor prioridad.',
  'It is the control plane. Control-plane and data-plane failures look similar to users but have different causes.':
    'Se trata del plano de control. Para los usuarios, los fallos del plano de control y del plano de datos se parecen, pero tienen causas distintas.',
  'It is the destination doing the actual work — serving the page, running the query, hosting the application.':
    'Es el destino que hace el trabajo real: servir la página, ejecutar la consulta, hospedar la aplicación.',
  'It is the general-purpose durable store that most workloads read from and write to.':
    'Es el almacén duradero de uso general desde el que leen y en el que escriben la mayoría de las cargas de trabajo.',
  'It is the most common place a reported issue is actually observed.':
    'Es el lugar más habitual donde se observa realmente un problema notificado.',
  'It is what makes a resource reachable from the internet, and it identifies your traffic when it leaves Azure.':
    'Es lo que hace que un recurso sea accesible desde Internet y lo que identifica su tráfico cuando sale de Azure.',
  'It is where a VM gets its IP configuration, and it is the most precise place to attach an NSG or check what rules and routes actually apply.':
    'Es donde una VM obtiene su configuración IP y el lugar más preciso para asociar un NSG o comprobar qué reglas y rutas se aplican realmente.',
  'It keeps credentials out of code and configuration, and gives you an audit trail of who read what.':
    'Mantiene las credenciales fuera del código y de la configuración, y le proporciona un registro de auditoría de quién leyó qué.',
  'It keeps firewall rules readable and lets you update one object instead of editing many rules.':
    'Mantiene legibles las reglas del firewall y le permite actualizar un único objeto en lugar de editar muchas reglas.',
  'It keeps rules meaningful as the environment scales — "web can reach app" survives every IP change.':
    'Hace que las reglas sigan teniendo sentido a medida que crece el entorno: "web puede alcanzar app" sobrevive a cualquier cambio de IP.',
  'It lets AKS workloads use Gateway API and Ingress objects to publish services without hand-managing gateway configuration.':
    'Permite que las cargas de trabajo de AKS usen la API de Gateway y objetos de entrada para publicar servicios sin administrar manualmente la configuración de la puerta de enlace.',
  'It lets you offer a service to customers or other business units without peering networks or exposing anything publicly.':
    'Le permite ofrecer un servicio a clientes o a otras unidades de negocio sin emparejar redes ni exponer nada públicamente.',
  'It lets you reach a PaaS service such as Storage or SQL over a private IP on the Microsoft backbone, so the public endpoint can be disabled entirely.':
    'Le permite alcanzar un servicio PaaS como Storage o SQL a través de una IP privada en la red troncal de Microsoft, de modo que el punto de conexión público se puede deshabilitar por completo.',
  'It lets you write rules once and inherit them across firewalls, with a parent policy for organisation-wide rules and child policies per environment.':
    'Le permite escribir las reglas una vez y heredarlas en varios firewalls, con una directiva primaria para las reglas de toda la organización y directivas secundarias por entorno.',
  'It lives in the reserved GatewaySubnet and pairs with a Local Network Gateway (the remote device) through a Connection resource. Routes are static or learned via BGP.':
    'Reside en la subred reservada GatewaySubnet y se empareja con una puerta de enlace de red local (el dispositivo remoto) mediante un recurso de conexión. Las rutas son estáticas o se aprenden por BGP.',
  'It marks where the user-visible experience begins, which is the perspective the customer is reporting from.':
    'Marca dónde empieza la experiencia visible para el usuario, que es la perspectiva desde la que informa el cliente.',
  'It never sees your traffic. It only returns a CNAME or IP in a DNS answer, so the client connects directly to the chosen endpoint afterwards.':
    'Nunca ve su tráfico. Solo devuelve un CNAME o una IP en una respuesta DNS, por lo que después el cliente se conecta directamente al punto de conexión elegido.',
  'It only works if DNS resolves the service hostname to the private IP. That is normally done with a Private DNS Zone linked to the VNet.':
    'Solo funciona si el DNS resuelve el nombre de host del servicio en la IP privada. Normalmente esto se consigue con una zona DNS privada vinculada a la VNet.',
  'It provides a SQL Server-compatible database without you patching, backing up, or clustering servers.':
    'Proporciona una base de datos compatible con SQL Server sin que usted tenga que aplicar revisiones, hacer copias de seguridad ni agrupar servidores en clústeres.',
  'It provides high availability and scale — if one backend instance fails its health probe, new connections stop going to it.':
    'Proporciona alta disponibilidad y escala: si una instancia de back-end no supera su sondeo de estado, las nuevas conexiones dejan de dirigirse a ella.',
  'It provides transit routing between everything attached to it, without you having to build gateway chaining or route tables by hand.':
    'Proporciona enrutamiento de tránsito entre todo lo que está conectado a él, sin que usted tenga que construir encadenamientos de puertas de enlace ni tablas de rutas a mano.',
  'It reaches Azure APIs over HTTPS, or reaches workloads directly over SSH, RDP, or an application port.':
    'Llega a las API de Azure mediante HTTPS, o llega directamente a las cargas de trabajo mediante SSH, RDP o un puerto de aplicación.',
  'It reaches Azure across a VPN tunnel or ExpressRoute circuit, or over the public internet.':
    'Llega a Azure a través de un túnel VPN, de un circuito de ExpressRoute o de Internet público.',
  'It removes OS patching and scaling work, so teams ship application code instead of infrastructure.':
    'Elimina el trabajo de aplicar revisiones al sistema operativo y de escalar, de modo que los equipos entregan código de aplicación en lugar de infraestructura.',
  'It removes the need to give VMs public IPs or open 3389/22 to the internet, which is one of the most exploited misconfigurations.':
    'Elimina la necesidad de asignar IP públicas a las VM o de abrir los puertos 3389/22 a Internet, una de las configuraciones incorrectas más explotadas.',
  'It removes the work of building and maintaining your own hubs, route tables, and gateway meshes across many regions and branches.':
    'Elimina el trabajo de crear y mantener sus propios centros, tablas de rutas y mallas de puertas de enlace en muchas regiones y sucursales.',
  'It represents scripted or interactive commands, which are often where the reproduction steps live.':
    'Representa comandos con scripts o interactivos, que suelen ser donde residen los pasos de reproducción.',
  'It resolves the target name through DNS and then connects to the returned address.':
    'Resuelve el nombre de destino mediante DNS y después se conecta a la dirección devuelta.',
  'It routes by URL path and hostname, terminates TLS so certificates live in one place, and can run a Web Application Firewall in front of your app.':
    'Enruta por ruta de URL y nombre de host, termina TLS para que los certificados estén en un único lugar y puede ejecutar un firewall de aplicaciones web delante de su aplicación.',
  'It separates billing, applies quota limits, and acts as a scope for role assignments and policy.':
    'Separa la facturación, aplica límites de cuota y actúa como ámbito para las asignaciones de roles y las directivas.',
  'It shares the App Service networking model — Private Endpoint for inbound, VNet integration for outbound. The hosting plan decides what is available: Flex Consumption and Premium both support VNet integration, the classic Consumption plan does not.': 'Comparte el modelo de red de App Service: Private Endpoint para la entrada e integración con VNet para la salida. El plan de hospedaje determina lo que está disponible: Flex Consumption y Premium admiten integración con VNet; el plan Consumption clásico no.',
  'It sits in the GatewaySubnet and is linked to a circuit through a connection. Route exchange is always via BGP.':
    'Reside en la subred GatewaySubnet y se vincula a un circuito mediante una conexión. El intercambio de rutas siempre se realiza por BGP.',
  'It steers users to the closest or highest-priority region and removes failed regions from DNS answers.':
    'Dirige a los usuarios a la región más cercana o de mayor prioridad y elimina de las respuestas DNS las regiones con errores.',
  'It suits glue logic and triggers where running a full application host would be wasteful.':
    'Es adecuado para lógica de unión y desencadenadores en los que ejecutar un host de aplicaciones completo sería un desperdicio.',
  'It suits short-lived or bursty jobs where a full Kubernetes cluster would be overkill.':
    'Es adecuado para trabajos breves o con picos en los que un clúster de Kubernetes completo sería excesivo.',
  'It suits workloads that need multi-region replication and predictable latency at scale.':
    'Es adecuado para cargas de trabajo que necesitan replicación multirregión y latencia predecible a gran escala.',
  'It terminates the user connection at the nearest Microsoft edge site, which cuts latency, and it fails over between regional backends automatically.':
    'Termina la conexión del usuario en el sitio perimetral de Microsoft más cercano, lo que reduce la latencia, y conmuta por error automáticamente entre back-end regionales.',
  'Key Vault stores secrets, keys, and certificates with access controlled by policy or RBAC.':
    'Key Vault almacena secretos, claves y certificados con el acceso controlado por directivas o RBAC.',
  'Make sure the return path has an equivalent route, or the flow becomes asymmetric and is dropped by the stateful firewall.':
    'Asegúrese de que la ruta de retorno tenga una ruta equivalente; de lo contrario, el flujo se vuelve asimétrico y el firewall con estado lo descarta.',
  'Management traffic often takes a completely different path from application traffic and has its own controls.':
    'El tráfico de administración suele seguir una ruta completamente distinta a la del tráfico de aplicación y tiene sus propios controles.',
  'Mobile clients frequently arrive over carrier networks or a Point-to-Site VPN, so their path differs from office clients.':
    'Los clientes móviles llegan con frecuencia por redes de operador o por una VPN de punto a sitio, por lo que su ruta difiere de la de los clientes de oficina.',
  'Most enterprise workloads are hybrid, so Azure resources must reach systems that still live on-premises (and vice versa).':
    'La mayoría de las cargas de trabajo empresariales son híbridas, por lo que los recursos de Azure deben alcanzar sistemas que siguen en el entorno local (y viceversa).',
  'NAT Gateway is zonal — confirm the zone matches the workload for zone-resilient designs.':
    'NAT Gateway es zonal: en diseños resistentes a zonas, confirme que la zona coincide con la de la carga de trabajo.',
  'NAT Gateway provides outbound-only internet connectivity for a subnet, using dedicated public IPs.':
    'NAT Gateway proporciona conectividad a Internet solo de salida para una subred, usando IP públicas dedicadas.',
  'NSGs and UDRs affect a Private Endpoint only when the subnet has PrivateEndpointNetworkPolicies enabled — it is disabled by default, so a rule you expect to match may never be evaluated at all.': 'Los NSG y las UDR afectan a un Private Endpoint solo cuando la subred tiene PrivateEndpointNetworkPolicies habilitado — está deshabilitado de forma predeterminada, así que una regla que espera que coincida puede no evaluarse nunca.',
  'Native client and IP-based connection require the Standard or Premium SKU.':
    'El cliente nativo y la conexión basada en IP requieren la SKU Estándar o Premium.',
  'Network Watcher is the diagnostics toolbox for Azure networking — connection troubleshoot, IP flow verify, next hop, packet capture, and flow logs.':
    'Network Watcher es la caja de herramientas de diagnóstico de las redes de Azure: solución de problemas de conexión, verificación de flujo IP, siguiente salto, captura de paquetes y registros de flujo.',
  'Azure CNI is the current plugin and the IP mode is what matters. In node-subnet or pod-subnet mode every pod gets a real VNet IP, so pod addresses must be planned into the subnet size; CNI Overlay instead puts pods on a separate overlay range and consumes far fewer VNet IPs. Legacy kubenet is retiring on 31 March 2028.': 'Azure CNI es el complemento actual y lo que importa es el modo de IP. En modo node-subnet o pod-subnet cada pod obtiene una IP real de la VNet, así que las direcciones de los pods deben planificarse en el tamaño de la subred; CNI Overlay, en cambio, coloca los pods en un rango de superposición aparte y consume muchas menos IP de la VNet. El kubenet heredado se retira el 31 de marzo de 2028.',
  'Nothing reaches the right destination if the name resolves to the wrong address — DNS is the first hop of almost every flow.':
    'Nada llega al destino correcto si el nombre se resuelve en una dirección equivocada: el DNS es el primer salto de casi todos los flujos.',
  'On-premises clients cannot query Azure Private DNS Zones directly, and Azure clients often need to resolve on-premises names. The resolver bridges both directions.':
    'Los clientes locales no pueden consultar directamente las zonas DNS privadas de Azure, y los clientes de Azure a menudo necesitan resolver nombres locales. El solucionador conecta ambos sentidos.',
  'One VM can have multiple NICs, and each NIC can hold multiple IP configurations. Accelerated Networking is enabled per NIC.':
    'Una VM puede tener varias NIC, y cada NIC puede contener varias configuraciones IP. Las redes aceleradas se habilitan por NIC.',
  'Outbound type (load balancer, NAT Gateway, or userDefinedRouting) determines the egress path.':
    'El tipo de salida (equilibrador de carga, NAT Gateway o userDefinedRouting) determina la ruta de salida.',
  'Over Private Link, confirm the privatelink.vaultcore.azure.net zone is linked to the VNet.':
    'A través de Private Link, confirme que la zona privatelink.vaultcore.azure.net está vinculada a la VNet.',
  'Over Private Link, verify the name resolves to the private IP.':
    'A través de Private Link, compruebe que el nombre se resuelve en la IP privada.',
  'Portal actions call Azure Resource Manager over HTTPS; they do not traverse your VNet.':
    'Las acciones del portal llaman a Azure Resource Manager mediante HTTPS; no atraviesan su VNet.',
  'Private Endpoint requires a DNS record for every region the account is replicated to.':
    'El punto de conexión privado requiere un registro DNS por cada región a la que se replica la cuenta.',
  'Private Link Service publishes your own service, sitting behind a Standard internal load balancer, so other VNets can consume it via a Private Endpoint.':
    'Private Link Service publica su propio servicio, situado detrás de un equilibrador de carga interno Estándar, para que otras VNet puedan consumirlo mediante un punto de conexión privado.',
  'Public-facing workloads must be reachable from the internet, and most workloads need outbound internet access for updates and API calls.':
    'Las cargas de trabajo públicas deben ser accesibles desde Internet, y la mayoría necesitan acceso saliente a Internet para actualizaciones y llamadas a API.',
  'Real environments contain third-party appliances, SaaS endpoints, and legacy systems that still shape the traffic path.':
    'Los entornos reales contienen dispositivos de terceros, puntos de conexión SaaS y sistemas heredados que siguen condicionando la ruta del tráfico.',
  'Redirect policy requires 11000-11999 outbound to be open — this is a very common firewall oversight.':
    'La directiva Redirect exige que los puertos 11000-11999 de salida estén abiertos: es un descuido muy común en los firewalls.',
  'Region choice controls latency to your users, data-residency compliance, and which services and SKUs are even available.':
    'La elección de la región determina la latencia hacia sus usuarios, el cumplimiento de la residencia de datos e incluso qué servicios y SKU están disponibles.',
  'Remember inbound is evaluated subnet-first then NIC; outbound is NIC-first then subnet.':
    'Recuerde que la entrada se evalúa primero en la subred y luego en la NIC; la salida, primero en la NIC y luego en la subred.',
  'Resource group membership never blocks traffic — if something is unreachable, look at NSG, UDR, DNS, or peering instead.':
    'La pertenencia a un grupo de recursos nunca bloquea el tráfico: si algo no es accesible, revise el NSG, la UDR, el DNS o el emparejamiento.',
  'Resources are placed in subnets inside the VNet. Everything in the same VNet can reach everything else by default; reaching another VNet requires peering, a gateway, or Private Link.':
    'Los recursos se colocan en subredes dentro de la VNet. De forma predeterminada, todo lo que está en la misma VNet puede alcanzar a todo lo demás; llegar a otra VNet requiere emparejamiento, una puerta de enlace o Private Link.',
  'Resources in different subscriptions can still be peered and connected, but quota, policy, and RBAC are evaluated per subscription.':
    'Los recursos de suscripciones distintas se pueden emparejar y conectar igualmente, pero la cuota, las directivas y RBAC se evalúan por suscripción.',
  'Rule collection groups are evaluated by priority, and inherited parent rules always run before child rules.':
    'Los grupos de colecciones de reglas se evalúan por prioridad, y las reglas heredadas de la directiva primaria se ejecutan siempre antes que las secundarias.',
  'Run IP flow verify for the failing 5-tuple — it names the deciding rule directly.':
    'Ejecute la verificación de flujo IP para la tupla de 5 elementos que falla: indica directamente la regla determinante.',
  'Run next hop from the source NIC to confirm the routing decision.':
    'Ejecute el siguiente salto desde la NIC de origen para confirmar la decisión de enrutamiento.',
  'Secured hub (Routing Intent) changes the path — confirm whether traffic is being sent to Azure Firewall.':
    'El centro protegido (intención de enrutamiento) cambia la ruta: confirme si el tráfico se está enviando a Azure Firewall.',
  'Service tags change over time; prefer them over hard-coded IP ranges.':
    'Las etiquetas de servicio cambian con el tiempo; úselas en lugar de intervalos IP codificados de forma rígida.',
  'Standard SKU addresses are static and secure-by-default — inbound is denied unless an NSG allows it. Basic SKU is retired.':
    'Las direcciones de la SKU Estándar son estáticas y seguras de forma predeterminada: la entrada se deniega salvo que un NSG la permita. La SKU Básica está retirada.',
  'Subnets let you segment a VNet so different tiers (web, app, data) can be secured and routed independently.':
    'Las subredes le permiten segmentar una VNet para que los distintos niveles (web, aplicación, datos) se puedan proteger y enrutar de forma independiente.',
  'Test on and off the corporate network — a split-tunnel VPN policy often explains "works for some users".':
    'Pruebe dentro y fuera de la red corporativa: una directiva de VPN con túnel dividido suele explicar el "funciona para algunos usuarios".',
  'The ALB controller in the cluster watches Kubernetes objects and programs the gateway, forwarding HTTP/HTTPS traffic straight to pod endpoints.':
    'El controlador ALB del clúster observa los objetos de Kubernetes y configura la puerta de enlace, reenviando el tráfico HTTP/HTTPS directamente a los puntos de conexión de los pods.',
  'The Azure portal — the browser-based management plane at portal.azure.com.':
    'El portal de Azure: el plano de administración basado en explorador disponible en portal.azure.com.',
  'The NAT subnet must have enough free IP addresses for the number of connections.':
    'La subred de NAT debe tener suficientes direcciones IP libres para el número de conexiones.',
  'The SDK can use direct mode, which opens additional TCP ports beyond 443, or gateway mode which uses 443 only.':
    'El SDK puede usar el modo directo, que abre puertos TCP adicionales además del 443, o el modo de puerta de enlace, que usa solo el 443.',
  'The backend must be behind a Standard SKU internal load balancer — Basic is not supported.':
    'El back-end debe estar detrás de un equilibrador de carga interno de SKU Estándar; la SKU Básica no es compatible.',
  'The circuit carries one or more peerings. Private peering reaches your VNets; Microsoft peering reaches Microsoft public services such as Microsoft 365.':
    'El circuito transporta uno o varios emparejamientos. El emparejamiento privado llega a sus VNet; el emparejamiento de Microsoft llega a servicios públicos de Microsoft como Microsoft 365.',
  'The client resolves a name through DNS, then connects to whatever public or private IP that name returns.':
    'El cliente resuelve un nombre mediante DNS y después se conecta a la IP pública o privada que ese nombre devuelva.',
  'The end user or client device that starts the request.':
    'El usuario final o el dispositivo cliente que inicia la solicitud.',
  'The function needs reachable storage; a blocked storage account stops the function starting at all.':
    'La función necesita un almacenamiento accesible; una cuenta de almacenamiento bloqueada impide por completo que la función se inicie.',
  'The gateway alone does nothing; the connection is what actually establishes and holds the tunnel or circuit link.':
    'La puerta de enlace por sí sola no hace nada; es la conexión la que realmente establece y mantiene el túnel o el vínculo del circuito.',
  'The guest OS firewall is a separate layer from the NSG — Windows Firewall or iptables can block traffic the NSG allowed.':
    'El firewall del sistema operativo invitado es una capa distinta del NSG: Firewall de Windows o iptables pueden bloquear tráfico que el NSG permitió.',
  'The plan is associated with a VNet, and every public IP in that VNet is then protected.':
    'El plan se asocia a una VNet y, a partir de ahí, todas las IP públicas de esa VNet quedan protegidas.',
  'The public internet — traffic arriving from, or leaving to, addresses outside your network.':
    'Internet público: tráfico que llega desde direcciones externas a su red o que sale hacia ellas.',
  'The subnet must be named exactly AzureBastionSubnet and be /26 or larger.':
    'La subred debe llamarse exactamente AzureBastionSubnet y ser de /26 o mayor.',
  'The target VM NSG must allow inbound 3389/22 FROM the Bastion subnet.':
    'El NSG de la VM de destino debe permitir la entrada por 3389/22 DESDE la subred de Bastion.',
  'The user resolves your hostname to the closest edge POP. The edge applies WAF and caching rules, then forwards over the Microsoft backbone to the healthiest origin.':
    'El usuario resuelve su nombre de host en el POP perimetral más cercano. El perímetro aplica las reglas de WAF y de caché y después reenvía por la red troncal de Microsoft al origen en mejor estado.',
  'This represents the customer network outside Azure — a corporate datacenter, branch office, or another cloud.':
    'Representa la red del cliente fuera de Azure: un centro de datos corporativo, una sucursal u otra nube.',
  'Traffic Manager is DNS-based global load balancing — it answers DNS queries with the endpoint you should use.':
    'Traffic Manager es un equilibrio de carga global basado en DNS: responde a las consultas DNS con el punto de conexión que debe usar.',
  'Traffic is steered to it with a UDR. For high availability it sits behind an internal load balancer, and its NIC must have IP forwarding enabled.':
    'El tráfico se dirige a él mediante una UDR. Para alta disponibilidad se sitúa detrás de un equilibrador de carga interno, y su NIC debe tener habilitado el reenvío IP.',
  'Traffic is steered to it with a User-Defined Route pointing at its private IP. Rules are evaluated in order: DNAT, then network rules, then application rules.':
    'El tráfico se dirige a él mediante una ruta definida por el usuario que apunta a su IP privada. Las reglas se evalúan en orden: DNAT, después reglas de red y por último reglas de aplicación.',
  'Treat it like any other hop: confirm what it listens on, what it forwards to, and who controls its rules.':
    'Trátelo como cualquier otro salto: confirme en qué escucha, hacia dónde reenvía y quién controla sus reglas.',
  'Use Effective security rules on the NIC — that shows the merged subnet + NIC result, which is what actually applies.':
    'Use las reglas de seguridad efectivas en la NIC: muestran el resultado combinado de subred y NIC, que es lo que se aplica realmente.',
  'Use effective routes on a workload NIC to prove the on-premises prefixes really arrived.':
    'Use las rutas efectivas en una NIC de carga de trabajo para demostrar que los prefijos locales llegaron realmente.',
  'Used as a generic actor when the exact device does not matter.':
    'Se usa como actor genérico cuando el dispositivo concreto no importa.',
  'VNet connections, VPN sites, and ExpressRoute circuits attach to the hub, and hub route tables control who can reach whom.':
    'Las conexiones de VNet, los sitios VPN y los circuitos de ExpressRoute se conectan al centro, y las tablas de rutas del centro controlan quién puede alcanzar a quién.',
  'VNet-deployed container groups need a delegated subnet.':
    'Los grupos de contenedores implementados en una VNet necesitan una subred delegada.',
  'VNet-injected APIM requires specific inbound NSG rules; missing them makes the service unhealthy.':
    'APIM inyectado en una VNet requiere reglas de NSG de entrada concretas; si faltan, el servicio queda en mal estado.',
  'Verify the SKU supports the tunnel count and throughput you need.':
    'Compruebe que la SKU admite el número de túneles y el rendimiento que necesita.',
  'Verify the VNet address space does not overlap with any peered VNet or the on-premises network.':
    'Compruebe que el espacio de direcciones de la VNet no se solapa con el de ninguna VNet emparejada ni con la red local.',
  'Verify the downstream party has allow-listed the whole prefix, not one address from it.':
    'Compruebe que la parte receptora ha incluido en la lista de permitidos el prefijo completo, no una sola dirección de él.',
  'Verify the target on-premises DNS server actually answers queries from the Azure source range.':
    'Compruebe que el servidor DNS local de destino responde realmente a las consultas procedentes del intervalo de origen de Azure.',
  'Verify you have not hit a subscription-level quota (public IPs, VNet peerings, gateway count).':
    'Compruebe que no ha alcanzado una cuota de nivel de suscripción (IP públicas, emparejamientos de VNet, número de puertas de enlace).',
  'Virtual WAN is a managed networking service that provides a global transit hub-and-spoke backbone.':
    'Virtual WAN es un servicio de red administrado que proporciona una red troncal global de tránsito de tipo centro y radio.',
  'Watch for overlapping address space between on-premises and the Azure VNet — that breaks routing.':
    'Vigile el solapamiento del espacio de direcciones entre el entorno local y la VNet de Azure: eso rompe el enrutamiento.',
  'You assign NICs to the ASG, then reference the ASG as the source or destination in NSG rules.':
    'Se asignan NIC al ASG y después se hace referencia al ASG como origen o destino en las reglas de NSG.',
  'You create hubs per region and connect VNets, branches (VPN), and ExpressRoute circuits to them. Microsoft handles the any-to-any routing between hubs.':
    'Se crean centros por región y se conectan a ellos VNet, sucursales (VPN) y circuitos de ExpressRoute. Microsoft se encarga del enrutamiento de todos a todos entre centros.',
  'You need it whenever traffic must take a path Azure would not choose on its own — for example forcing all egress through a firewall or NVA.':
    'Se necesita siempre que el tráfico deba seguir una ruta que Azure no elegiría por sí solo, por ejemplo forzar toda la salida a través de un firewall o un NVA.',
  'Zone-redundant vs zonal matters for availability during a zone outage.':
    'La diferencia entre redundante de zona y zonal es importante para la disponibilidad durante una interrupción de zona.',
};

const pt: Dict = {
  'A 0.0.0.0/0 route with next hop None or a stale appliance IP blackholes all outbound traffic.':
    'Uma rota 0.0.0.0/0 com próximo salto None ou com o IP desatualizado de um dispositivo descarta silenciosamente todo o tráfego de saída.',
  'A 403 is authorisation (RBAC or access policy); a connection timeout is network.':
    'Um 403 é autorização (RBAC ou política de acesso); um tempo limite de conexão é rede.',
  'A 403 usually means authorisation or firewall; a name-resolution failure means DNS.':
    'Um 403 normalmente indica autorização ou firewall; uma falha de resolução de nomes indica DNS.',
  'A Connection is the resource that pairs an Azure gateway with the remote side — a Local Network Gateway, another VNet gateway, or an ExpressRoute circuit.':
    'Uma conexão é o recurso que emparelha um gateway do Azure com o lado remoto: um gateway de rede local, outro gateway de VNet ou um circuito do ExpressRoute.',
  'A DDoS Protection plan adds always-on traffic monitoring and adaptive mitigation for public IPs in protected VNets.':
    'Um plano de Proteção contra DDoS adiciona monitoramento contínuo de tráfego e mitigação adaptativa para os IPs públicos das VNets protegidas.',
  'A DNS zone holds the records that translate names into IP addresses. A Private DNS Zone is only visible to VNets that are linked to it.':
    'Uma zona DNS contém os registros que traduzem nomes em endereços IP. Uma zona DNS privada só é visível para as VNets vinculadas a ela.',
  'A Function App runs small pieces of event-driven code, billed by execution.':
    'Um aplicativo de funções executa pequenos trechos de código orientado a eventos, cobrados por execução.',
  'A Local Network Gateway is the Azure object that describes your on-premises VPN device — its public IP and the prefixes behind it.':
    'Um gateway de rede local é o objeto do Azure que descreve o seu dispositivo VPN local: o IP público dele e os prefixos que ficam atrás.',
  'A NIC is the virtual network adapter that attaches a VM to a subnet and holds its private IP.':
    'Uma NIC é o adaptador de rede virtual que conecta uma VM a uma sub-rede e contém o IP privado dela.',
  'A Private DNS Zone is linked to one or more VNets. With auto-registration enabled, VMs in a linked VNet register their own records.':
    'Uma zona DNS privada é vinculada a uma ou mais VNets. Com o registro automático habilitado, as VMs de uma VNet vinculada registram os próprios registros.',
  'A Private Endpoint is a NIC in your subnet that holds a private IP mapped to a specific PaaS resource.':
    'Um ponto de extremidade privado é uma NIC na sua sub-rede que contém um IP privado mapeado para um recurso PaaS específico.',
  'A Public IP Prefix is a contiguous block of public addresses reserved for your subscription.':
    'Um prefixo de IP público é um bloco contíguo de endereços públicos reservado para a sua assinatura.',
  'A Public IP is an internet-routable address assigned to a gateway, load balancer, firewall, or VM NIC.':
    'Um IP público é um endereço roteável pela Internet atribuído a um gateway, balanceador de carga, firewall ou NIC de VM.',
  'A Scale Set manages an identical group of VMs that grows and shrinks automatically.':
    'Um conjunto de dimensionamento gerencia um grupo idêntico de VMs que cresce e diminui automaticamente.',
  'A Storage Account holds blobs, files, queues, and tables behind a public hostname per service.':
    'Uma conta de armazenamento contém blobs, arquivos, filas e tabelas atrás de um nome de host público por serviço.',
  'A VPN Gateway terminates encrypted IPsec/IKE tunnels between Azure and an on-premises device or remote user.':
    'Um gateway de VPN encerra túneis criptografados IPsec/IKE entre o Azure e um dispositivo local ou um usuário remoto.',
  'A Virtual Machine is a server you run in Azure, with its own operating system and applications.':
    'Uma máquina virtual é um servidor executado no Azure, com sistema operacional e aplicativos próprios.',
  'A Virtual Network is your private, isolated network in Azure, defined by one or more address ranges (CIDR blocks).':
    'Uma rede virtual é a sua rede privada e isolada no Azure, definida por um ou mais intervalos de endereços (blocos CIDR).',
  'A Virtual WAN hub is the Microsoft-managed regional hub VNet that spokes and branches connect into.':
    'Um hub da WAN Virtual é a VNet de hub regional gerenciada pela Microsoft à qual os spokes e as filiais se conectam.',
  'A WAF policy is the rule set that inspects HTTP requests for common web attacks such as SQL injection and cross-site scripting.':
    'Uma política de WAF é o conjunto de regras que inspeciona as solicitações HTTP em busca de ataques comuns à Web, como injeção de SQL e script entre sites.',
  'A client application or device making the request.':
    'Um aplicativo cliente ou dispositivo que faz a solicitação.',
  'A command-line session such as PowerShell, Bash, or Azure CLI.':
    'Uma sessão de linha de comando como PowerShell, Bash ou CLI do Azure.',
  'A custom element added to represent something outside the standard Azure resource set.':
    'Um elemento personalizado adicionado para representar algo fora do conjunto padrão de recursos do Azure.',
  'A legitimate request being blocked shows up as a 403 — check the WAF logs for the triggering rule ID and add an exclusion.':
    'Uma solicitação legítima bloqueada aparece como 403: verifique nos logs do WAF a ID da regra acionada e adicione uma exclusão.',
  'A listener accepts the request on the front-end IP, a rule matches it, and the request is forwarded to a backend pool member that the health probe reports as healthy.':
    'Um ouvinte aceita a solicitação no IP de front-end, uma regra faz a correspondência e a solicitação é encaminhada a um membro do pool de back-end que a investigação de integridade considera íntegro.',
  'A load-balancing rule maps a front-end IP and port to a backend pool and port. It does not inspect or modify the payload, so it cannot route by URL.':
    'Uma regra de balanceamento de carga mapeia um IP e uma porta de front-end para um pool e uma porta de back-end. Ela não inspeciona nem modifica o conteúdo, portanto não pode rotear por URL.',
  'A missing or wrong prefix here is the single most common cause of "the tunnel is up but traffic does not pass".':
    'Um prefixo ausente ou incorreto aqui é de longe a causa mais comum de "o túnel está ativo, mas o tráfego não passa".',
  'A mobile device acting as the client.': 'Um dispositivo móvel atuando como cliente.',
  'A person or role involved in the flow.': 'Uma pessoa ou função envolvida no fluxo.',
  'A portal error is control plane (ARM, RBAC, policy) — it is not evidence of a data-path problem.':
    'Um erro do portal pertence ao plano de controle (ARM, RBAC, política): não é evidência de um problema no caminho de dados.',
  'A resource group is a logical container that holds related Azure resources.':
    'Um grupo de recursos é um contêiner lógico que agrupa recursos relacionados do Azure.',
  'A resource group is a management construct only — it does not affect network reachability. Two resources in different resource groups talk to each other normally.':
    'Um grupo de recursos é apenas uma construção de gerenciamento: não afeta a acessibilidade de rede. Dois recursos em grupos diferentes se comunicam normalmente.',
  'A route table holds User-Defined Routes that override the routes Azure creates by default.':
    'Uma tabela de rotas contém rotas definidas pelo usuário que substituem as rotas criadas pelo Azure por padrão.',
  'A server — typically an on-premises or third-party host outside Azure.':
    'Um servidor, normalmente um host local ou de terceiros fora do Azure.',
  'A subnet is a slice of the VNet address space where resources actually get their IP addresses.':
    'Uma sub-rede é uma fatia do espaço de endereços da VNet onde os recursos realmente recebem seus endereços IP.',
  'A subscription is the billing and quota boundary that resources are created in.':
    'Uma assinatura é o limite de cobrança e de cota dentro do qual os recursos são criados.',
  'A user laptop or workstation.': 'Um notebook ou uma estação de trabalho de usuário.',
  'AKS is managed Kubernetes — Azure runs the control plane and you run workloads in node pools.':
    'O AKS é Kubernetes gerenciado: o Azure executa o plano de controle e você executa as cargas de trabalho em pools de nós.',
  'API Management is a gateway that publishes, secures, and throttles APIs.':
    'O Gerenciamento de API é um gateway que publica, protege e limita APIs.',
  'Access can be restricted with the firewall and virtual network rules, or made fully private with a Private Endpoint per sub-resource (blob, file, and so on).':
    'O acesso pode ser restringido pelo firewall e por regras de rede virtual, ou tornado totalmente privado com um ponto de extremidade privado por sub-recurso (blob, arquivo e assim por diante).',
  'Admins usually reach resources through the Azure portal, Bastion, or a jump host rather than the application front door.':
    'Os administradores geralmente chegam aos recursos pelo portal do Azure, pelo Bastion ou por um host de salto, e não pela porta de entrada do aplicativo.',
  'An ASG is a label you attach to NICs so NSG rules can target a workload role instead of IP addresses.':
    'Um ASG é um rótulo anexado às NICs para que as regras de NSG apontem para uma função de carga de trabalho em vez de endereços IP.',
  'An Azure region is a set of datacenters in one geography that hosts your resources.':
    'Uma região do Azure é um conjunto de datacenters em uma mesma geografia que hospeda seus recursos.',
  'An ExpressRoute Gateway is the VNet-side endpoint that attaches a VNet to an ExpressRoute circuit.':
    'Um gateway do ExpressRoute é o ponto de extremidade do lado da VNet que conecta uma VNet a um circuito do ExpressRoute.',
  'An ExpressRoute circuit is a private Layer-3 connection between your network and Microsoft, provided by a connectivity partner.':
    'Um circuito do ExpressRoute é uma conexão privada de camada 3 entre a sua rede e a Microsoft, fornecida por um parceiro de conectividade.',
  'An INBOUND endpoint gives on-premises an IP in Azure to forward queries to. An OUTBOUND endpoint plus a forwarding ruleset sends Azure queries for specific domains to on-premises DNS servers.':
    'Um ponto de extremidade de ENTRADA fornece ao ambiente local um IP no Azure para o qual encaminhar consultas. Um ponto de extremidade de SAÍDA com um conjunto de regras de encaminhamento envia as consultas do Azure de domínios específicos aos servidores DNS locais.',
  'An IP Group is a named, reusable collection of IP addresses and ranges.':
    'Um grupo de IP é uma coleção nomeada e reutilizável de endereços e intervalos IP.',
  'An NSG and a route table are attached at the subnet level, so every resource in the subnet inherits those rules. Some services require a dedicated, specially-named subnet (for example GatewaySubnet, AzureFirewallSubnet, AzureBastionSubnet).':
    'Um NSG e uma tabela de rotas são anexados no nível da sub-rede, portanto todos os recursos da sub-rede herdam essas regras. Alguns serviços exigem uma sub-rede dedicada com nome específico (por exemplo, GatewaySubnet, AzureFirewallSubnet, AzureBastionSubnet).',
  'An NSG is a stateful packet filter with allow and deny rules based on source, destination, port, and protocol.':
    'Um NSG é um filtro de pacotes com estado, com regras de permissão e negação baseadas em origem, destino, porta e protocolo.',
  'An NVA is a third-party firewall, router, or proxy running as a VM inside your VNet.':
    'Um NVA é um firewall, roteador ou proxy de terceiros executado como VM dentro da sua VNet.',
  'An administrator performing management or troubleshooting work.':
    'Um administrador realizando trabalho de gerenciamento ou de solução de problemas.',
  'An image pull failure over Private Link is nearly always DNS — verify the registry name resolves to the private IP.':
    'Uma falha ao extrair imagem pelo Private Link quase sempre é de DNS: verifique se o nome do registro é resolvido para o IP privado.',
  'App Service is a managed platform for hosting web apps and APIs without managing servers.':
    'O Serviço de Aplicativo é uma plataforma gerenciada para hospedar aplicativos Web e APIs sem gerenciar servidores.',
  'Application Gateway for Containers is the Kubernetes-native Layer-7 ingress built on the Application Gateway platform.':
    'O Application Gateway for Containers é a entrada de camada 7 nativa do Kubernetes criada sobre a plataforma do Application Gateway.',
  'Application Gateway is a regional Layer-7 (HTTP/HTTPS) load balancer.':
    'O Application Gateway é um balanceador de carga regional de camada 7 (HTTP/HTTPS).',
  'Application rules need the FQDN; if the client resolves DNS differently, the rule will not match.':
    'As regras de aplicativo precisam do FQDN; se o cliente resolver o DNS de forma diferente, a regra não fará correspondência.',
  'Asymmetric routing is a classic failure — the return path must also traverse the firewall.':
    'O roteamento assimétrico é uma falha clássica: o caminho de retorno também precisa atravessar o firewall.',
  'Azure Bastion is a managed jump host that gives browser-based RDP and SSH access to VMs.':
    'O Azure Bastion é um host de salto gerenciado que oferece acesso RDP e SSH às VMs pelo navegador.',
  'Azure Container Registry stores and serves your container images.':
    'O Registro de Contêiner do Azure armazena e fornece suas imagens de contêiner.',
  'Azure Firewall is a managed, stateful network firewall that inspects traffic against DNAT, network, and application rules.':
    'O Firewall do Azure é um firewall de rede gerenciado e com estado que inspeciona o tráfego com base em regras DNAT, de rede e de aplicativo.',
  'Azure Firewall rules reference the IP Group by name in the source or destination field.':
    'As regras do Firewall do Azure fazem referência ao grupo de IP pelo nome no campo de origem ou de destino.',
  'Azure Load Balancer is a Layer-4 (TCP/UDP) load balancer that spreads connections across a backend pool.':
    'O Balanceador de Carga do Azure é um balanceador de camada 4 (TCP/UDP) que distribui conexões por um pool de back-end.',
  'Azure SQL Database is a managed relational database service.':
    'O Banco de Dados SQL do Azure é um serviço gerenciado de banco de dados relacional.',
  'Azure needs to know which address ranges live on the far side of the tunnel so it can route to them.':
    'O Azure precisa saber quais intervalos de endereços estão do outro lado do túnel para poder rotear até eles.',
  'Azure protects its platform by default, but a Network Protection plan tunes mitigation to YOUR traffic and adds attack telemetry plus cost protection.':
    'O Azure protege a plataforma dele por padrão, mas um plano de proteção de rede ajusta a mitigação ao SEU tráfego e adiciona telemetria de ataques e proteção de custos.',
  'Because it is DNS-based, client-side DNS caching and TTL delay failover — check the TTL.':
    'Por ser baseado em DNS, o cache de DNS do cliente e o TTL atrasam o failover: verifique o TTL.',
  'Both the source and destination ASG must be in the SAME virtual network for a rule to work.':
    'Para que uma regra funcione, o ASG de origem e o de destino precisam estar na MESMA rede virtual.',
  'Caching can mask a backend change — purge before concluding the backend is wrong.':
    'O cache pode mascarar uma alteração no back-end: limpe-o antes de concluir que o back-end está errado.',
  'Capture the exact command and full error text — it usually names the failing endpoint and port.':
    'Capture o comando exato e o texto completo do erro: normalmente ele indica o ponto de extremidade e a porta com falha.',
  'Check BGP session state and the advertised/received route counts on each peering.':
    'Verifique o estado da sessão BGP e a contagem de rotas anunciadas e recebidas em cada emparelhamento.',
  'Check DDoS mitigation metrics before assuming an outage is application-side.':
    'Verifique as métricas de mitigação de DDoS antes de supor que a interrupção é do lado do aplicativo.',
  'Check SNAT port utilisation metrics if outbound connections start failing intermittently.':
    'Verifique as métricas de utilização de portas SNAT se as conexões de saída começarem a falhar de forma intermitente.',
  'Check backend health first — an unhealthy pool returns 502.':
    'Verifique primeiro a integridade do back-end: um pool não íntegro retorna 502.',
  'Check connection status and the ingress/egress byte counters — zero bytes with a Connected state points at routing, not the tunnel.':
    'Verifique o status da conexão e os contadores de bytes de entrada e saída: zero byte com estado Conectado aponta para o roteamento, e não para o túnel.',
  'Check container logs and restart count first — an app crash looks like a network failure from outside.':
    'Verifique primeiro os logs do contêiner e a contagem de reinicializações: de fora, uma falha do aplicativo parece uma falha de rede.',
  'Check effective routes and effective security rules on the NIC.':
    'Verifique as rotas efetivas e as regras de segurança efetivas na NIC.',
  'Check effective routes on a NIC in this VNet to see what next hop Azure is actually using.':
    'Verifique as rotas efetivas de uma NIC desta VNet para ver qual próximo salto o Azure está usando de fato.',
  'Check effective routes on the NIC — that is the ground truth, not the route table definition.':
    'Verifique as rotas efetivas na NIC: essa é a realidade, e não a definição da tabela de rotas.',
  'Check endpoint monitor status; an endpoint marked Degraded is removed from responses.':
    'Verifique o status de monitoramento do ponto de extremidade; um ponto marcado como Degradado é removido das respostas.',
  'Check for a delete lock or Azure Policy assignment at this scope if a deployment is failing.':
    'Se uma implantação estiver falhando, verifique se há um bloqueio de exclusão ou uma atribuição do Azure Policy neste escopo.',
  'Check for asymmetric routing — both directions must traverse the same appliance instance.':
    'Verifique se há roteamento assimétrico: os dois sentidos precisam atravessar a mesma instância do dispositivo.',
  'Check health probe status — if every instance is unhealthy the load balancer silently drops traffic.':
    'Verifique o status da investigação de integridade: se todas as instâncias estiverem não íntegras, o balanceador de carga descarta o tráfego silenciosamente.',
  'Check hub routing status and the effective routes for the connection in question.':
    'Verifique o status de roteamento do hub e as rotas efetivas da conexão em questão.',
  'Check origin health probes and the origin host header setting — a mismatch causes 4xx from the origin.':
    'Verifique as investigações de integridade da origem e a configuração do cabeçalho de host de origem: uma divergência causa erros 4xx vindos da origem.',
  'Check priority ordering — a broad deny in a parent policy silently overrides a child allow.':
    'Verifique a ordem de prioridade: uma negação ampla em uma política pai substitui silenciosamente uma permissão de política filha.',
  'Check that the on-premises prefixes are present in the Local Network Gateway (or advertised via BGP).':
    'Verifique se os prefixos locais estão presentes no gateway de rede local (ou são anunciados via BGP).',
  'Check that the on-premises router actually advertises the local prefixes, and that it learns the Azure address space.':
    'Verifique se o roteador local realmente anuncia os prefixos locais e se ele aprende o espaço de endereços do Azure.',
  'Check the A record exists and points at the expected IP.':
    'Verifique se o registro A existe e aponta para o IP esperado.',
  'Check the ALB controller pod logs in the cluster.':
    'Verifique os logs do pod do controlador ALB no cluster.',
  'Check the NSG attached to this subnet — subnet rules are evaluated before NIC rules for inbound traffic.':
    'Verifique o NSG anexado a esta sub-rede: para o tráfego de entrada, as regras de sub-rede são avaliadas antes das regras de NIC.',
  'Check the connection state is Approved, not Pending.':
    'Verifique se o estado da conexão é Aprovado, e não Pendente.',
  'Check the default rules — DenyAllInbound at priority 65500 catches anything you did not explicitly allow.':
    'Verifique as regras padrão: DenyAllInbound, com prioridade 65500, captura tudo o que você não permitiu explicitamente.',
  'Check the effective routes on the hub route table, not just on the spoke.':
    'Verifique as rotas efetivas na tabela de rotas do hub, e não apenas no spoke.',
  'Check the firewall logs for the specific flow — they tell you which rule allowed or denied it.':
    'Verifique os logs do firewall para esse fluxo específico: eles indicam qual regra o permitiu ou negou.',
  'Check the forwarding ruleset is linked to the VNet, and that the rule domain name ends with a trailing dot.':
    'Verifique se o conjunto de regras de encaminhamento está vinculado à VNet e se o nome de domínio da regra termina com um ponto final.',
  'Check the number of routes learned — exceeding the route limit drops the BGP session.':
    'Verifique o número de rotas aprendidas: ultrapassar o limite de rotas derruba a sessão BGP.',
  'Check the policy trace for the failing call — the answer is usually a policy, not the network.':
    'Verifique o rastreamento de políticas da chamada com falha: a resposta normalmente está em uma política, não na rede.',
  'Check the route on the server itself — it must know to send the Azure prefixes to the tunnel.':
    'Verifique a rota no próprio servidor: ele precisa saber que deve enviar os prefixos do Azure para o túnel.',
  'Check the route table attached to this subnet for a UDR that overrides the default system route.':
    'Verifique na tabela de rotas anexada a esta sub-rede se há uma UDR que substitui a rota padrão do sistema.',
  'Check the service is actually available in this region (some SKUs are region-limited).':
    'Verifique se o serviço está realmente disponível nesta região (algumas SKUs têm limitação por região).',
  'Check the service type — ClusterIP is cluster-internal only, LoadBalancer creates an Azure load balancer.':
    'Verifique o tipo de serviço: ClusterIP é apenas interno ao cluster, enquanto LoadBalancer cria um balanceador de carga do Azure.',
  'Check what the client resolves the name to, and from which network it is connecting.':
    'Verifique para que o cliente resolve o nome e de qual rede ele está se conectando.',
  'Check whether Access Restrictions are blocking the caller.':
    'Verifique se as Restrições de Acesso estão bloqueando o chamador.',
  'Check whether the client is on the corporate network, on VPN, or on the public internet, because the path differs.':
    'Verifique se o cliente está na rede corporativa, em VPN ou na Internet pública, porque o caminho é diferente em cada caso.',
  'Check whether unhealthy instances are being rolled — an instance can be up but failing its probe.':
    'Verifique se instâncias não íntegras estão sendo substituídas: uma instância pode estar ativa e ainda assim falhar na investigação.',
  'Circuits are redundant by design — verify BOTH links, not just the primary.':
    'Os circuitos são redundantes por design: verifique OS DOIS links, não apenas o primário.',
  'Client-side caching can hide a fix — flush the resolver cache before retesting.':
    'O cache do cliente pode ocultar uma correção: limpe o cache do resolvedor antes de testar novamente.',
  'Compare a lookup and a connection test from the laptop against the same test run inside Azure.':
    'Compare uma resolução de nome e um teste de conexão feitos do notebook com o mesmo teste executado dentro do Azure.',
  'Compare the IPsec policy on this connection with the on-premises configuration line by line.':
    'Compare linha a linha a política IPsec desta conexão com a configuração local.',
  'Compute platforms need somewhere private and close to pull images from at deployment time.':
    'As plataformas de computação precisam de um local privado e próximo de onde extrair imagens no momento da implantação.',
  'Confirm IP forwarding is enabled if this NIC belongs to an NVA that must route traffic for others.':
    'Confirme que o encaminhamento IP está habilitado se esta NIC pertence a um NVA que precisa rotear tráfego para outros.',
  'Confirm a UDR actually forces the traffic through the firewall; without it traffic bypasses the firewall entirely.':
    'Confirme que uma UDR realmente força o tráfego a passar pelo firewall; sem ela, o tráfego o contorna por completo.',
  'Confirm a virtual network link exists between the zone and the client VNet — without it the zone is invisible.':
    'Confirme que existe um link de rede virtual entre a zona e a VNet do cliente: sem ele, a zona fica invisível.',
  'Confirm backend certificate validation settings if the backend uses a private CA.':
    'Confirme as configurações de validação do certificado de back-end se o back-end usa uma autoridade de certificação privada.',
  'Confirm both sides of the flow are in the region you expect — cross-region hops add latency and egress charges.':
    'Confirme que os dois lados do fluxo estão na região esperada: saltos entre regiões adicionam latência e cobranças de saída.',
  'Confirm the NIC really is a member — an unassigned NIC silently falls through to the deny rule.':
    'Confirme que a NIC é realmente membro: uma NIC não atribuída cai silenciosamente na regra de negação.',
  'Confirm the NSG on the Application Gateway subnet allows the required inbound ports from the GatewayManager service tag.':
    'Confirme que o NSG da sub-rede do Application Gateway permite as portas de entrada necessárias vindas da marca de serviço GatewayManager.',
  'Confirm the NSG on the backend NICs or subnet allows the probe source (AzureLoadBalancer service tag) and the data port.':
    'Confirme que o NSG das NICs de back-end ou da sub-rede permite a origem da investigação (marca de serviço AzureLoadBalancer) e a porta de dados.',
  'Confirm the Private DNS Zone is linked to the VNet the client sits in, and that the A record exists.':
    'Confirme que a zona DNS privada está vinculada à VNet em que o cliente está e que o registro A existe.',
  'Confirm the UDR next hop points at the NVA private IP (or the internal load balancer front end for an HA pair).':
    'Confirme que o próximo salto da UDR aponta para o IP privado do NVA (ou para o front-end do balanceador de carga interno, no caso de um par de alta disponibilidade).',
  'Confirm the VNet DNS setting (Azure-provided vs custom DNS servers) matches what the workload expects.':
    'Confirme que a configuração de DNS da VNet (DNS fornecido pelo Azure ou servidores DNS personalizados) corresponde ao que a carga de trabalho espera.',
  'Confirm the VNet connection propagates to, and associates with, the route tables you expect.':
    'Confirme que a conexão de VNet propaga para as tabelas de rotas esperadas e se associa a elas.',
  'Confirm the VNet is actually associated with the plan.':
    'Confirme que a VNet está realmente associada ao plano.',
  'Confirm the address is actually associated with the resource you think it is.':
    'Confirme que o endereço está realmente associado ao recurso que você imagina.',
  'Confirm the address you expect is really in the group — a missing entry looks exactly like a firewall deny.':
    'Confirme que o endereço esperado está realmente no grupo: uma entrada ausente se parece exatamente com uma negação de firewall.',
  'Confirm the admin path (Bastion, VPN, or portal) separately — it can fail while the app path works.':
    'Verifique o caminho de administração (Bastion, VPN ou portal) separadamente: ele pode falhar enquanto o caminho do aplicativo funciona.',
  'Confirm the application is actually listening on the expected port (netstat or ss).':
    'Confirme que o aplicativo está realmente escutando na porta esperada (netstat ou ss).',
  'Confirm the association subnet is delegated correctly and has free addresses.':
    'Confirme que a sub-rede de associação está delegada corretamente e tem endereços livres.',
  'Confirm the circuit status is Provisioned and the peering is configured on both the provider and Microsoft side.':
    'Confirme que o status do circuito é Provisionado e que o emparelhamento está configurado tanto no lado do provedor quanto no da Microsoft.',
  'Confirm the consumer connection request has been approved.':
    'Confirme que a solicitação de conexão do consumidor foi aprovada.',
  'Confirm the gateway SKU supports the required throughput and the number of circuit connections.':
    'Confirme que a SKU do gateway dá suporte à taxa de transferência necessária e ao número de conexões de circuito.',
  'Confirm the local firewall and any host-based firewall permit the flow in both directions.':
    'Confirme que o firewall local e qualquer firewall baseado em host permitem o fluxo nos dois sentidos.',
  'Confirm the on-premises conditional forwarder points at the inbound endpoint IP, and that UDP and TCP port 53 are open across the tunnel.':
    'Confirme que o encaminhador condicional local aponta para o IP do ponto de extremidade de entrada e que a porta 53 UDP e TCP está aberta pelo túnel.',
  'Confirm the on-premises firewall permits the required ports in BOTH directions.':
    'Confirme que o firewall local permite as portas necessárias nos DOIS sentidos.',
  'Confirm the origin only accepts traffic from Front Door (X-Azure-FDID header or the AzureFrontDoor.Backend service tag).':
    'Confirme que a origem só aceita tráfego vindo do Front Door (cabeçalho X-Azure-FDID ou marca de serviço AzureFrontDoor.Backend).',
  'Confirm the hosting plan supports the networking feature you need — the classic Consumption plan has no VNet integration, while Flex Consumption and Premium do.': 'Confirme que o plano de hospedagem oferece o recurso de rede necessário: o plano Consumption clássico não tem integração de VNet, enquanto Flex Consumption e Premium têm.',
  'Confirm the policy is actually associated with the firewall handling this traffic.':
    'Confirme que a política está realmente associada ao firewall que trata esse tráfego.',
  'Confirm the public IP matches the on-premises device address seen from the internet after NAT.':
    'Confirme que o IP público corresponde ao endereço do dispositivo local visto da Internet após o NAT.',
  'Confirm the pulling identity has the AcrPull role.':
    'Confirme que a identidade que faz a extração tem a função AcrPull.',
  'Confirm the server firewall rules or Private Endpoint permit the client.':
    'Confirme que as regras de firewall do servidor ou o ponto de extremidade privado permitem o cliente.',
  'Confirm the subnet has enough free addresses for the maximum pods per node under Azure CNI.':
    'Confirme que a sub-rede tem endereços livres suficientes para o número máximo de pods por nó com a CNI do Azure.',
  'Confirm the subnet is large enough — Azure reserves 5 addresses in every subnet.':
    'Confirme que a sub-rede é grande o bastante: o Azure reserva 5 endereços em cada sub-rede.',
  'Confirm the tunnel is Connected, not just Provisioned.':
    'Confirme que o túnel está Conectado, e não apenas Provisionado.',
  'Confirm the upgrade policy is not mid-rollout when investigating inconsistent behaviour.':
    'Ao investigar comportamento inconsistente, confirme que a política de atualização não está no meio de uma implantação.',
  'Confirm what the client actually resolves the name to — a wrong DNS answer sends traffic to the wrong place.':
    'Confirme para que o cliente realmente resolve o nome: uma resposta DNS errada envia o tráfego para o lugar errado.',
  'Confirm whether the policy is in Detection or Prevention mode before concluding it is not the cause.':
    'Confirme se a política está em modo de Detecção ou de Prevenção antes de concluir que ela não é a causa.',
  'Consumers create a Private Endpoint that requests a connection; you approve it. Traffic arrives with the source NAT applied by the platform.':
    'Os consumidores criam um ponto de extremidade privado que solicita uma conexão e você a aprova. O tráfego chega com o NAT de origem aplicado pela plataforma.',
  'Container Instances runs a single container without any cluster to manage.':
    'As Instâncias de Contêiner executam um único contêiner sem nenhum cluster para gerenciar.',
  'Cosmos DB is a globally distributed NoSQL database with low-latency reads and writes.':
    'O Cosmos DB é um banco de dados NoSQL distribuído globalmente com leituras e gravações de baixa latência.',
  'Cross-subscription peering and Private Link need permissions in BOTH subscriptions.':
    'O emparelhamento entre assinaturas e o Private Link exigem permissões nas DUAS assinaturas.',
  'Customers use one when they need a specific vendor feature set, or want the same appliance on-premises and in Azure.':
    'Os clientes usam um quando precisam do conjunto de recursos de um fornecedor específico ou querem o mesmo dispositivo no ambiente local e no Azure.',
  'DNS Private Resolver is a managed service that resolves DNS between on-premises and Azure without you running DNS server VMs.':
    'O DNS Private Resolver é um serviço gerenciado que resolve DNS entre o ambiente local e o Azure sem que você precise executar VMs de servidor DNS.',
  'DNS is the number-one cause of failure — run a lookup from the client and confirm it returns the private IP, not the public one.':
    'O DNS é a causa número um de falhas: faça uma resolução a partir do cliente e confirme que ela retorna o IP privado, e não o público.',
  'Direct mode needs TCP 10250-10255 and 10000-20000 open; gateway mode only needs 443.':
    'O modo direto precisa das portas TCP 10250-10255 e 10000-20000 abertas; o modo gateway precisa apenas da 443.',
  'Each sub-resource needs its OWN Private Endpoint and its own privatelink DNS zone.':
    'Cada sub-recurso precisa do PRÓPRIO ponto de extremidade privado e da própria zona DNS privatelink.',
  'Effective routes and effective security rules are both read from the NIC — always start here.':
    'Tanto as rotas efetivas quanto as regras de segurança efetivas são lidas na NIC: comece sempre por aqui.',
  'Enable VNet flow logs for a historical record of allow and deny decisions.':
    'Habilite os logs de fluxo da VNet para ter um histórico das decisões de permissão e negação.',
  'Every traffic flow needs an origin — this is the person or application whose experience you are troubleshooting.':
    'Todo fluxo de tráfego precisa de uma origem: é a pessoa ou o aplicativo cuja experiência você está investigando.',
  'Everything drawn inside this boundary is deployed in the same region, so traffic between those resources stays on the regional network rather than crossing the internet.':
    'Tudo o que está desenhado dentro deste limite é implantado na mesma região, portanto o tráfego entre esses recursos permanece na rede regional em vez de atravessar a Internet.',
  'Firewall Policy is the reusable rule container that one or more Azure Firewalls apply.':
    'A Política de Firewall é o contêiner de regras reutilizável aplicado por um ou mais Firewalls do Azure.',
  'For Private Endpoints, the zone name must match the required pattern exactly (for example privatelink.blob.core.windows.net).':
    'Para pontos de extremidade privados, o nome da zona precisa corresponder exatamente ao padrão exigido (por exemplo, privatelink.blob.core.windows.net).',
  'For Standard SKU, remember inbound is closed by default until an NSG rule opens it.':
    'Na SKU Standard, lembre-se de que a entrada fica fechada por padrão até que uma regra de NSG a abra.',
  'For TLS errors, check certificate expiry, chain, and whether the backend hostname matches the certificate.':
    'Para erros de TLS, verifique a validade do certificado, a cadeia e se o nome de host do back-end corresponde ao certificado.',
  'For an internal load balancer, confirm the client is on a network that can reach the private front-end IP.':
    'Em um balanceador de carga interno, confirme que o cliente está em uma rede capaz de alcançar o IP privado de front-end.',
  'For inbound: confirm the public IP, the NSG allow rule, and the health of the backend.':
    'Para a entrada: confirme o IP público, a regra de permissão do NSG e a integridade do back-end.',
  'For outbound VNet integration, WEBSITE_DNS_SERVER and route-all settings decide whether traffic uses VNet DNS and routes.':
    'Na integração de VNet de saída, as configurações WEBSITE_DNS_SERVER e route-all determinam se o tráfego usa o DNS e as rotas da VNet.',
  'For outbound: confirm an explicit method exists — a NAT Gateway, a load balancer outbound rule, or a public IP on the NIC. Default outbound access was retired on 30 September 2025, so a new VM without one of these has no internet access at all.': 'Para a saída: confirme que existe um método explícito — um NAT Gateway, uma regra de saída do balanceador de carga ou um IP público na NIC. O acesso de saída padrão foi desativado em 30 de setembro de 2025, portanto uma VM nova sem nenhum deles não tem acesso à Internet.',
  'Front Door is a global Layer-7 entry point with content delivery and WAF built in.':
    'O Front Door é um ponto de entrada global de camada 7 com entrega de conteúdo e WAF integrados.',
  'Gateway, Firewall, and Bastion subnets must use their exact reserved names or deployment fails.':
    'As sub-redes de gateway, firewall e Bastion precisam usar exatamente os nomes reservados, ou a implantação falha.',
  'Hybrid flows depend on it, and it is frequently the piece nobody has console access to during a call.':
    'Os fluxos híbridos dependem dele e, com frequência, é a peça a cujo console ninguém tem acesso durante uma chamada.',
  'IKE phase 1/2 settings, PSK, and the IPsec policy must match EXACTLY on both ends.':
    'As configurações das fases 1 e 2 do IKE, a chave pré-compartilhada e a política IPsec precisam coincidir EXATAMENTE nas duas pontas.',
  'IP forwarding must be enabled on the NVA NIC in Azure AND inside the guest OS.':
    'O encaminhamento IP precisa estar habilitado na NIC do NVA no Azure E dentro do sistema operacional convidado.',
  'If the account firewall is set to selected networks, confirm the caller subnet or IP is listed.':
    'Se o firewall da conta estiver configurado para redes selecionadas, confirme que a sub-rede ou o IP do chamador está listado.',
  'If the firewall is restricted, confirm the caller network or the trusted-services exception is allowed.':
    'Se o firewall estiver restrito, confirme que a rede do chamador ou a exceção de serviços confiáveis é permitida.',
  'Inbound and outbound are configured independently — confirm which direction is failing.':
    'A entrada e a saída são configuradas de forma independente: confirme qual sentido está falhando.',
  'Inbound and outbound endpoints each need their own delegated subnet.':
    'Os pontos de extremidade de entrada e de saída precisam, cada um, da própria sub-rede delegada.',
  'Inbound internet traffic lands on a public IP attached to a gateway, load balancer, or VM. Outbound traffic leaves through a NAT Gateway, a load balancer, or a firewall.':
    'O tráfego de entrada da Internet chega a um IP público anexado a um gateway, balanceador de carga ou VM. O tráfego de saída sai por um Gateway de NAT, um balanceador de carga ou um firewall.',
  'Inbound private access uses a Private Endpoint. Outbound access into a VNet uses regional VNet integration — the two are separate features.':
    'O acesso privado de entrada usa um ponto de extremidade privado. O acesso de saída para uma VNet usa a integração regional com VNet: são recursos distintos.',
  'Individual public IPs are then allocated from the prefix and assigned to resources such as a NAT Gateway or load balancer.':
    'Em seguida, IPs públicos individuais são alocados a partir do prefixo e atribuídos a recursos como um Gateway de NAT ou um balanceador de carga.',
  'Instances share one network configuration and normally sit in a load balancer or Application Gateway backend pool.':
    'As instâncias compartilham uma única configuração de rede e normalmente ficam no pool de back-end de um balanceador de carga ou do Application Gateway.',
  'It answers "is this being blocked, and by what?" with data instead of guesswork.':
    'Ele responde com dados, em vez de suposições, à pergunta "isso está sendo bloqueado e por quê?".',
  'It attaches to Application Gateway or Front Door and runs in Detection mode (log only) or Prevention mode (block).':
    'Ele se conecta ao Application Gateway ou ao Front Door e é executado em modo de Detecção (apenas log) ou de Prevenção (bloqueio).',
  'It attaches to a subnet, a NIC, or both. Rules are evaluated by priority, lowest number first, and the first match wins. Because it is stateful, return traffic for an allowed flow is permitted automatically.':
    'Ele se anexa a uma sub-rede, a uma NIC ou a ambas. As regras são avaliadas por prioridade, do menor número para o maior, e a primeira correspondência vence. Por ter estado, o tráfego de retorno de um fluxo permitido é liberado automaticamente.',
  'It attaches to a subnet. Azure picks the most specific matching prefix; if two routes tie, a UDR beats a BGP route, which beats a system route.':
    'Ele se anexa a uma sub-rede. O Azure escolhe o prefixo correspondente mais específico; se duas rotas empatarem, uma UDR vence uma rota BGP, que vence uma rota do sistema.',
  'It attaches to one or more subnets. Once attached, it takes priority over all other outbound methods for those subnets. It never allows unsolicited inbound traffic.':
    'Ele se anexa a uma ou mais sub-redes. Depois de anexado, tem prioridade sobre todos os outros métodos de saída dessas sub-redes. Ele nunca permite tráfego de entrada não solicitado.',
  'It avoids the public internet entirely, giving predictable latency, higher bandwidth, and an SLA.':
    'Ele evita completamente a Internet pública, oferecendo latência previsível, mais largura de banda e um SLA.',
  'It blocks application-layer attacks that a Layer-4 firewall or NSG cannot see, because those only look at IP and port.':
    'Ele bloqueia ataques da camada de aplicativo que um firewall de camada 4 ou um NSG não conseguem enxergar, porque estes só analisam IP e porta.',
  'It can be deployed into a VNet subnet for private access, or given a public IP for direct access.':
    'Ele pode ser implantado em uma sub-rede de VNet para acesso privado ou receber um IP público para acesso direto.',
  'It can be external (public front end) or internal (VNet-only). In VNet mode it has strict required NSG rules and dependency endpoints.':
    'Ele pode ser externo (front-end público) ou interno (somente VNet). No modo VNet, tem regras de NSG obrigatórias rígidas e pontos de extremidade de dependência.',
  'It can be reached publicly, or privately through a Private Endpoint with the matching Private DNS Zone.':
    'Ele pode ser acessado publicamente ou de forma privada por um ponto de extremidade privado com a zona DNS privada correspondente.',
  'It cannot be used for inbound; if inbound is needed, that is a separate load balancer or public IP.':
    'Ele não pode ser usado para entrada; se a entrada for necessária, isso exige um balanceador de carga ou IP público separado.',
  'It carries the shared key, the IPsec/IKE policy, and the BGP setting for that specific link.':
    'Ele carrega a chave compartilhada, a política IPsec/IKE e a configuração de BGP daquele link específico.',
  'It centralises egress control and logging, so one policy governs what an entire hub-and-spoke estate is allowed to reach.':
    'Ele centraliza o controle e o registro da saída, de modo que uma única política determina o que todo um ambiente hub-and-spoke pode alcançar.',
  'It clarifies who experiences the behaviour being described.':
    'Ele esclarece quem vivencia o comportamento descrito.',
  'It connects from the office LAN, from home, or through a VPN client, and each path resolves DNS differently.':
    'Ele se conecta pela LAN do escritório, de casa ou por um cliente VPN, e cada caminho resolve o DNS de maneira diferente.',
  'It connects over the public internet unless a VPN profile is applied.':
    'Ele se conecta pela Internet pública, a menos que um perfil de VPN seja aplicado.',
  'It connects to Azure through a Site-to-Site VPN tunnel or an ExpressRoute circuit. Routes are exchanged either statically or via BGP.':
    'Ele se conecta ao Azure por um túnel VPN site a site ou por um circuito do ExpressRoute. As rotas são trocadas de forma estática ou via BGP.',
  'It connects to a subnet through a NIC. Its reachability is governed by the NSG on that NIC and on the subnet, plus the guest OS firewall.':
    'Ele se conecta a uma sub-rede por meio de uma NIC. A acessibilidade dele é determinada pelo NSG dessa NIC e da sub-rede, além do firewall do sistema operacional convidado.',
  'It gives container workloads scheduling, self-healing, and scaling without you operating Kubernetes masters.':
    'Ele oferece às cargas de trabalho em contêineres agendamento, autorrecuperação e dimensionamento sem que você opere mestres do Kubernetes.',
  'It gives one consistent front door for many backends, with authentication, rate limiting, and transformation applied by policy.':
    'Ele oferece uma porta de entrada única e consistente para muitos back-ends, com autenticação, limitação de taxa e transformação aplicadas por política.',
  'It gives you a predictable, unchanging range so partners and firewalls can allow-list your egress addresses once.':
    'Ele oferece um intervalo previsível e imutável para que parceiros e firewalls incluam seus endereços de saída na lista de permissões uma única vez.',
  'It gives you a stable, known egress address and a very large pool of SNAT ports, which prevents the port-exhaustion failures common with default outbound access.':
    'Ele oferece um endereço de saída estável e conhecido e um conjunto muito grande de portas SNAT, o que evita as falhas por esgotamento de portas comuns no acesso de saída padrão.',
  'It gives you private connectivity into the VNet over the public internet, without exposing resources publicly.':
    'Ele oferece conectividade privada até a VNet pela Internet pública, sem expor recursos publicamente.',
  'It gives your resources private IP addresses and a security boundary, so they can talk to each other privately instead of over the public internet.':
    'Ele dá aos seus recursos endereços IP privados e um limite de segurança, para que possam se comunicar de forma privada em vez de pela Internet pública.',
  'It groups resources with a shared lifecycle so they can be deployed, permissioned, and deleted together.':
    'Ele agrupa recursos com um ciclo de vida comum para que possam ser implantados, autorizados e excluídos em conjunto.',
  'It handles scale and instance repair for you, so capacity follows demand without manual VM creation.':
    'Ele cuida do dimensionamento e do reparo de instâncias por você, de modo que a capacidade acompanhe a demanda sem criação manual de VMs.',
  'It injects the routes learned from on-premises into the VNet and forwards traffic onto the private circuit.':
    'Ele injeta na VNet as rotas aprendidas do ambiente local e encaminha o tráfego para o circuito privado.',
  'It is deployed into a dedicated AzureBastionSubnet. The admin connects to the Azure portal over TLS, and Bastion opens the RDP or SSH session to the VM private IP.':
    'Ele é implantado em uma AzureBastionSubnet dedicada. O administrador se conecta ao portal do Azure por TLS, e o Bastion abre a sessão RDP ou SSH para o IP privado da VM.',
  'It is enabled per region. IP flow verify names the exact NSG rule that allowed or denied a flow; next hop shows where a packet would actually be routed.':
    'Ele é habilitado por região. A verificação de fluxo IP indica a regra de NSG exata que permitiu ou negou um fluxo; o próximo salto mostra para onde um pacote seria realmente roteado.',
  'It is reached over HTTPS. It can be locked down with firewall rules or a Private Endpoint, and callers usually authenticate with a managed identity.':
    'Ele é acessado por HTTPS. Pode ser restringido com regras de firewall ou um ponto de extremidade privado, e os chamadores normalmente se autenticam com uma identidade gerenciada.',
  'It is reached over TCP 1433. The connection policy is Redirect (which also needs ports 11000-11999) or Proxy (1433 only).':
    'Ele é acessado por TCP 1433. A política de conexão é Redirect (que também precisa das portas 11000-11999) ou Proxy (apenas 1433).',
  'It is referenced by a Connection resource, which pairs it with the Azure VPN Gateway. With BGP, the prefix list is learned dynamically instead.':
    'Ele é referenciado por um recurso de conexão, que o emparelha com o gateway de VPN do Azure. Com BGP, a lista de prefixos passa a ser aprendida dinamicamente.',
  'It is the basic segmentation control in Azure, but it does not deny by default: the built-in AllowVNetInBound rule already permits all traffic inside the virtual network, so segmentation starts only when you add your own higher-priority deny.': 'É o controle básico de segmentação do Azure, mas ele não nega por padrão: a regra interna AllowVNetInBound já permite todo o tráfego dentro da rede virtual, portanto a segmentação só começa quando você adiciona sua própria regra de negação com prioridade maior.',
  'It is the control plane. Control-plane and data-plane failures look similar to users but have different causes.':
    'Trata-se do plano de controle. Para os usuários, as falhas do plano de controle e do plano de dados parecem semelhantes, mas têm causas diferentes.',
  'It is the destination doing the actual work — serving the page, running the query, hosting the application.':
    'É o destino que faz o trabalho de fato: servir a página, executar a consulta, hospedar o aplicativo.',
  'It is the general-purpose durable store that most workloads read from and write to.':
    'É o armazenamento durável de uso geral do qual a maioria das cargas de trabalho lê e no qual grava.',
  'It is the most common place a reported issue is actually observed.':
    'É o local mais comum onde um problema relatado é de fato observado.',
  'It is what makes a resource reachable from the internet, and it identifies your traffic when it leaves Azure.':
    'É o que torna um recurso acessível pela Internet e o que identifica o seu tráfego quando ele sai do Azure.',
  'It is where a VM gets its IP configuration, and it is the most precise place to attach an NSG or check what rules and routes actually apply.':
    'É onde uma VM obtém a configuração de IP e o lugar mais preciso para anexar um NSG ou verificar quais regras e rotas realmente se aplicam.',
  'It keeps credentials out of code and configuration, and gives you an audit trail of who read what.':
    'Ele mantém as credenciais fora do código e da configuração e fornece uma trilha de auditoria de quem leu o quê.',
  'It keeps firewall rules readable and lets you update one object instead of editing many rules.':
    'Ele mantém as regras de firewall legíveis e permite atualizar um único objeto em vez de editar muitas regras.',
  'It keeps rules meaningful as the environment scales — "web can reach app" survives every IP change.':
    'Ele mantém as regras significativas conforme o ambiente cresce: "web pode alcançar app" sobrevive a qualquer mudança de IP.',
  'It lets AKS workloads use Gateway API and Ingress objects to publish services without hand-managing gateway configuration.':
    'Ele permite que as cargas de trabalho do AKS usem a API de Gateway e objetos de Ingresso para publicar serviços sem gerenciar manualmente a configuração do gateway.',
  'It lets you offer a service to customers or other business units without peering networks or exposing anything publicly.':
    'Ele permite oferecer um serviço a clientes ou a outras unidades de negócio sem emparelhar redes nem expor nada publicamente.',
  'It lets you reach a PaaS service such as Storage or SQL over a private IP on the Microsoft backbone, so the public endpoint can be disabled entirely.':
    'Ele permite alcançar um serviço PaaS como Armazenamento ou SQL por um IP privado no backbone da Microsoft, de modo que o ponto de extremidade público possa ser totalmente desabilitado.',
  'It lets you write rules once and inherit them across firewalls, with a parent policy for organisation-wide rules and child policies per environment.':
    'Ele permite escrever as regras uma vez e herdá-las em vários firewalls, com uma política pai para regras de toda a organização e políticas filhas por ambiente.',
  'It lives in the reserved GatewaySubnet and pairs with a Local Network Gateway (the remote device) through a Connection resource. Routes are static or learned via BGP.':
    'Ele fica na sub-rede reservada GatewaySubnet e é emparelhado com um gateway de rede local (o dispositivo remoto) por meio de um recurso de conexão. As rotas são estáticas ou aprendidas via BGP.',
  'It marks where the user-visible experience begins, which is the perspective the customer is reporting from.':
    'Ele marca onde começa a experiência visível para o usuário, que é a perspectiva a partir da qual o cliente está relatando.',
  'It never sees your traffic. It only returns a CNAME or IP in a DNS answer, so the client connects directly to the chosen endpoint afterwards.':
    'Ele nunca vê o seu tráfego. Ele apenas retorna um CNAME ou IP em uma resposta DNS, de modo que o cliente se conecta depois diretamente ao ponto de extremidade escolhido.',
  'It only works if DNS resolves the service hostname to the private IP. That is normally done with a Private DNS Zone linked to the VNet.':
    'Só funciona se o DNS resolver o nome de host do serviço para o IP privado. Normalmente isso é feito com uma zona DNS privada vinculada à VNet.',
  'It provides a SQL Server-compatible database without you patching, backing up, or clustering servers.':
    'Ele fornece um banco de dados compatível com o SQL Server sem que você precise aplicar patches, fazer backup ou montar clusters de servidores.',
  'It provides high availability and scale — if one backend instance fails its health probe, new connections stop going to it.':
    'Ele fornece alta disponibilidade e escala: se uma instância de back-end falhar na investigação de integridade, as novas conexões deixam de ir para ela.',
  'It provides transit routing between everything attached to it, without you having to build gateway chaining or route tables by hand.':
    'Ele fornece roteamento de trânsito entre tudo o que está conectado a ele, sem que você precise montar encadeamento de gateways ou tabelas de rotas manualmente.',
  'It reaches Azure APIs over HTTPS, or reaches workloads directly over SSH, RDP, or an application port.':
    'Ele alcança as APIs do Azure por HTTPS ou alcança as cargas de trabalho diretamente por SSH, RDP ou uma porta de aplicativo.',
  'It reaches Azure across a VPN tunnel or ExpressRoute circuit, or over the public internet.':
    'Ele alcança o Azure por um túnel VPN, por um circuito do ExpressRoute ou pela Internet pública.',
  'It removes OS patching and scaling work, so teams ship application code instead of infrastructure.':
    'Ele elimina o trabalho de aplicar patches ao sistema operacional e de dimensionar, para que as equipes entreguem código de aplicativo em vez de infraestrutura.',
  'It removes the need to give VMs public IPs or open 3389/22 to the internet, which is one of the most exploited misconfigurations.':
    'Ele elimina a necessidade de dar IPs públicos às VMs ou abrir as portas 3389/22 para a Internet, uma das configurações incorretas mais exploradas.',
  'It removes the work of building and maintaining your own hubs, route tables, and gateway meshes across many regions and branches.':
    'Ele elimina o trabalho de criar e manter seus próprios hubs, tabelas de rotas e malhas de gateways em muitas regiões e filiais.',
  'It represents scripted or interactive commands, which are often where the reproduction steps live.':
    'Ele representa comandos em script ou interativos, que costumam ser onde ficam as etapas de reprodução.',
  'It resolves the target name through DNS and then connects to the returned address.':
    'Ele resolve o nome de destino pelo DNS e depois se conecta ao endereço retornado.',
  'It routes by URL path and hostname, terminates TLS so certificates live in one place, and can run a Web Application Firewall in front of your app.':
    'Ele roteia por caminho de URL e nome de host, encerra o TLS para que os certificados fiquem em um único lugar e pode executar um Firewall de Aplicativo Web na frente do seu aplicativo.',
  'It separates billing, applies quota limits, and acts as a scope for role assignments and policy.':
    'Ele separa a cobrança, aplica limites de cota e funciona como escopo para atribuições de função e políticas.',
  'It shares the App Service networking model — Private Endpoint for inbound, VNet integration for outbound. The hosting plan decides what is available: Flex Consumption and Premium both support VNet integration, the classic Consumption plan does not.': 'Ele compartilha o modelo de rede do App Service — Private Endpoint para entrada e integração de VNet para saída. O plano de hospedagem determina o que está disponível: Flex Consumption e Premium oferecem integração de VNet; o plano Consumption clássico não.',
  'It sits in the GatewaySubnet and is linked to a circuit through a connection. Route exchange is always via BGP.':
    'Ele fica na GatewaySubnet e é vinculado a um circuito por meio de uma conexão. A troca de rotas é sempre via BGP.',
  'It steers users to the closest or highest-priority region and removes failed regions from DNS answers.':
    'Ele direciona os usuários para a região mais próxima ou de maior prioridade e remove das respostas DNS as regiões com falha.',
  'It suits glue logic and triggers where running a full application host would be wasteful.':
    'Ele é adequado para lógica de integração e gatilhos em que executar um host de aplicativo completo seria desperdício.',
  'It suits short-lived or bursty jobs where a full Kubernetes cluster would be overkill.':
    'Ele é adequado para trabalhos curtos ou com picos, nos quais um cluster completo do Kubernetes seria exagero.',
  'It suits workloads that need multi-region replication and predictable latency at scale.':
    'Ele é adequado para cargas de trabalho que precisam de replicação multirregião e latência previsível em escala.',
  'It terminates the user connection at the nearest Microsoft edge site, which cuts latency, and it fails over between regional backends automatically.':
    'Ele encerra a conexão do usuário no site de borda da Microsoft mais próximo, o que reduz a latência, e faz failover automaticamente entre back-ends regionais.',
  'Key Vault stores secrets, keys, and certificates with access controlled by policy or RBAC.':
    'O Key Vault armazena segredos, chaves e certificados com acesso controlado por política ou RBAC.',
  'Make sure the return path has an equivalent route, or the flow becomes asymmetric and is dropped by the stateful firewall.':
    'Garanta que o caminho de retorno tenha uma rota equivalente; caso contrário, o fluxo se torna assimétrico e é descartado pelo firewall com estado.',
  'Management traffic often takes a completely different path from application traffic and has its own controls.':
    'O tráfego de gerenciamento costuma seguir um caminho totalmente diferente do tráfego de aplicativo e tem controles próprios.',
  'Mobile clients frequently arrive over carrier networks or a Point-to-Site VPN, so their path differs from office clients.':
    'Os clientes móveis chegam com frequência por redes de operadora ou por uma VPN ponto a site, portanto o caminho deles difere do dos clientes do escritório.',
  'Most enterprise workloads are hybrid, so Azure resources must reach systems that still live on-premises (and vice versa).':
    'A maioria das cargas de trabalho corporativas é híbrida, portanto os recursos do Azure precisam alcançar sistemas que ainda estão no ambiente local (e vice-versa).',
  'NAT Gateway is zonal — confirm the zone matches the workload for zone-resilient designs.':
    'O Gateway de NAT é zonal: em designs resilientes a zonas, confirme que a zona corresponde à da carga de trabalho.',
  'NAT Gateway provides outbound-only internet connectivity for a subnet, using dedicated public IPs.':
    'O Gateway de NAT fornece conectividade de Internet somente de saída para uma sub-rede, usando IPs públicos dedicados.',
  'NSGs and UDRs affect a Private Endpoint only when the subnet has PrivateEndpointNetworkPolicies enabled — it is disabled by default, so a rule you expect to match may never be evaluated at all.': 'NSGs e UDRs afetam um Private Endpoint apenas quando a sub-rede tem PrivateEndpointNetworkPolicies habilitado — ele vem desabilitado por padrão, então uma regra que você espera que corresponda pode nunca ser avaliada.',
  'Native client and IP-based connection require the Standard or Premium SKU.':
    'O cliente nativo e a conexão baseada em IP exigem a SKU Standard ou Premium.',
  'Network Watcher is the diagnostics toolbox for Azure networking — connection troubleshoot, IP flow verify, next hop, packet capture, and flow logs.':
    'O Observador de Rede é a caixa de ferramentas de diagnóstico das redes do Azure: solução de problemas de conexão, verificação de fluxo IP, próximo salto, captura de pacotes e logs de fluxo.',
  'Azure CNI is the current plugin and the IP mode is what matters. In node-subnet or pod-subnet mode every pod gets a real VNet IP, so pod addresses must be planned into the subnet size; CNI Overlay instead puts pods on a separate overlay range and consumes far fewer VNet IPs. Legacy kubenet is retiring on 31 March 2028.': 'O Azure CNI é o plug-in atual e o que importa é o modo de IP. No modo node-subnet ou pod-subnet cada pod recebe um IP real da VNet, portanto os endereços dos pods precisam ser planejados no tamanho da sub-rede; já o CNI Overlay coloca os pods em um intervalo de sobreposição separado e consome muito menos IPs da VNet. O kubenet herdado será desativado em 31 de março de 2028.',
  'Nothing reaches the right destination if the name resolves to the wrong address — DNS is the first hop of almost every flow.':
    'Nada chega ao destino correto se o nome for resolvido para o endereço errado: o DNS é o primeiro salto de quase todos os fluxos.',
  'On-premises clients cannot query Azure Private DNS Zones directly, and Azure clients often need to resolve on-premises names. The resolver bridges both directions.':
    'Os clientes locais não podem consultar diretamente as zonas DNS privadas do Azure, e os clientes do Azure muitas vezes precisam resolver nomes locais. O resolvedor conecta os dois sentidos.',
  'One VM can have multiple NICs, and each NIC can hold multiple IP configurations. Accelerated Networking is enabled per NIC.':
    'Uma VM pode ter várias NICs, e cada NIC pode conter várias configurações de IP. A Rede Acelerada é habilitada por NIC.',
  'Outbound type (load balancer, NAT Gateway, or userDefinedRouting) determines the egress path.':
    'O tipo de saída (balanceador de carga, Gateway de NAT ou userDefinedRouting) determina o caminho de saída.',
  'Over Private Link, confirm the privatelink.vaultcore.azure.net zone is linked to the VNet.':
    'Pelo Private Link, confirme que a zona privatelink.vaultcore.azure.net está vinculada à VNet.',
  'Over Private Link, verify the name resolves to the private IP.':
    'Pelo Private Link, verifique se o nome é resolvido para o IP privado.',
  'Portal actions call Azure Resource Manager over HTTPS; they do not traverse your VNet.':
    'As ações do portal chamam o Azure Resource Manager por HTTPS; elas não atravessam a sua VNet.',
  'Private Endpoint requires a DNS record for every region the account is replicated to.':
    'O ponto de extremidade privado exige um registro DNS para cada região à qual a conta é replicada.',
  'Private Link Service publishes your own service, sitting behind a Standard internal load balancer, so other VNets can consume it via a Private Endpoint.':
    'O Private Link Service publica o seu próprio serviço, posicionado atrás de um balanceador de carga interno Standard, para que outras VNets possam consumi-lo por um ponto de extremidade privado.',
  'Public-facing workloads must be reachable from the internet, and most workloads need outbound internet access for updates and API calls.':
    'As cargas de trabalho públicas precisam ser acessíveis pela Internet, e a maioria delas precisa de acesso de saída à Internet para atualizações e chamadas de API.',
  'Real environments contain third-party appliances, SaaS endpoints, and legacy systems that still shape the traffic path.':
    'Os ambientes reais contêm dispositivos de terceiros, pontos de extremidade SaaS e sistemas herdados que continuam moldando o caminho do tráfego.',
  'Redirect policy requires 11000-11999 outbound to be open — this is a very common firewall oversight.':
    'A política Redirect exige que as portas 11000-11999 de saída estejam abertas: esse é um descuido muito comum nos firewalls.',
  'Region choice controls latency to your users, data-residency compliance, and which services and SKUs are even available.':
    'A escolha da região determina a latência para os seus usuários, a conformidade de residência de dados e até quais serviços e SKUs estão disponíveis.',
  'Remember inbound is evaluated subnet-first then NIC; outbound is NIC-first then subnet.':
    'Lembre-se de que a entrada é avaliada primeiro na sub-rede e depois na NIC; a saída, primeiro na NIC e depois na sub-rede.',
  'Resource group membership never blocks traffic — if something is unreachable, look at NSG, UDR, DNS, or peering instead.':
    'A participação em um grupo de recursos nunca bloqueia o tráfego: se algo estiver inacessível, verifique o NSG, a UDR, o DNS ou o emparelhamento.',
  'Resources are placed in subnets inside the VNet. Everything in the same VNet can reach everything else by default; reaching another VNet requires peering, a gateway, or Private Link.':
    'Os recursos são colocados em sub-redes dentro da VNet. Por padrão, tudo o que está na mesma VNet pode alcançar todo o restante; alcançar outra VNet exige emparelhamento, um gateway ou o Private Link.',
  'Resources in different subscriptions can still be peered and connected, but quota, policy, and RBAC are evaluated per subscription.':
    'Recursos em assinaturas diferentes ainda podem ser emparelhados e conectados, mas cota, política e RBAC são avaliados por assinatura.',
  'Rule collection groups are evaluated by priority, and inherited parent rules always run before child rules.':
    'Os grupos de coleções de regras são avaliados por prioridade, e as regras herdadas da política pai são sempre executadas antes das regras filhas.',
  'Run IP flow verify for the failing 5-tuple — it names the deciding rule directly.':
    'Execute a verificação de fluxo IP para a tupla de 5 elementos com falha: ela indica diretamente a regra determinante.',
  'Run next hop from the source NIC to confirm the routing decision.':
    'Execute o próximo salto a partir da NIC de origem para confirmar a decisão de roteamento.',
  'Secured hub (Routing Intent) changes the path — confirm whether traffic is being sent to Azure Firewall.':
    'O hub protegido (Intenção de Roteamento) altera o caminho: confirme se o tráfego está sendo enviado ao Firewall do Azure.',
  'Service tags change over time; prefer them over hard-coded IP ranges.':
    'As marcas de serviço mudam com o tempo; prefira-as a intervalos de IP fixos no código.',
  'Standard SKU addresses are static and secure-by-default — inbound is denied unless an NSG allows it. Basic SKU is retired.':
    'Os endereços da SKU Standard são estáticos e seguros por padrão: a entrada é negada, a menos que um NSG a permita. A SKU Basic foi desativada.',
  'Subnets let you segment a VNet so different tiers (web, app, data) can be secured and routed independently.':
    'As sub-redes permitem segmentar uma VNet para que camadas diferentes (web, aplicativo, dados) possam ser protegidas e roteadas de forma independente.',
  'Test on and off the corporate network — a split-tunnel VPN policy often explains "works for some users".':
    'Teste dentro e fora da rede corporativa: uma política de VPN com túnel dividido costuma explicar o "funciona para alguns usuários".',
  'The ALB controller in the cluster watches Kubernetes objects and programs the gateway, forwarding HTTP/HTTPS traffic straight to pod endpoints.':
    'O controlador ALB no cluster observa os objetos do Kubernetes e programa o gateway, encaminhando o tráfego HTTP/HTTPS diretamente para os pontos de extremidade dos pods.',
  'The Azure portal — the browser-based management plane at portal.azure.com.':
    'O portal do Azure: o plano de gerenciamento baseado em navegador em portal.azure.com.',
  'The NAT subnet must have enough free IP addresses for the number of connections.':
    'A sub-rede de NAT precisa ter endereços IP livres suficientes para o número de conexões.',
  'The SDK can use direct mode, which opens additional TCP ports beyond 443, or gateway mode which uses 443 only.':
    'O SDK pode usar o modo direto, que abre portas TCP adicionais além da 443, ou o modo gateway, que usa apenas a 443.',
  'The backend must be behind a Standard SKU internal load balancer — Basic is not supported.':
    'O back-end precisa estar atrás de um balanceador de carga interno da SKU Standard; a SKU Basic não é compatível.',
  'The circuit carries one or more peerings. Private peering reaches your VNets; Microsoft peering reaches Microsoft public services such as Microsoft 365.':
    'O circuito transporta um ou mais emparelhamentos. O emparelhamento privado alcança as suas VNets; o emparelhamento da Microsoft alcança serviços públicos da Microsoft, como o Microsoft 365.',
  'The client resolves a name through DNS, then connects to whatever public or private IP that name returns.':
    'O cliente resolve um nome pelo DNS e depois se conecta ao IP público ou privado que esse nome retornar.',
  'The end user or client device that starts the request.':
    'O usuário final ou o dispositivo cliente que inicia a solicitação.',
  'The function needs reachable storage; a blocked storage account stops the function starting at all.':
    'A função precisa de um armazenamento acessível; uma conta de armazenamento bloqueada impede totalmente a inicialização da função.',
  'The gateway alone does nothing; the connection is what actually establishes and holds the tunnel or circuit link.':
    'O gateway sozinho não faz nada; é a conexão que de fato estabelece e mantém o túnel ou o link do circuito.',
  'The guest OS firewall is a separate layer from the NSG — Windows Firewall or iptables can block traffic the NSG allowed.':
    'O firewall do sistema operacional convidado é uma camada separada do NSG: o Firewall do Windows ou o iptables podem bloquear tráfego que o NSG permitiu.',
  'The plan is associated with a VNet, and every public IP in that VNet is then protected.':
    'O plano é associado a uma VNet e, a partir daí, todos os IPs públicos dessa VNet ficam protegidos.',
  'The public internet — traffic arriving from, or leaving to, addresses outside your network.':
    'A Internet pública: tráfego que chega de endereços fora da sua rede ou que sai para eles.',
  'The subnet must be named exactly AzureBastionSubnet and be /26 or larger.':
    'A sub-rede precisa se chamar exatamente AzureBastionSubnet e ser /26 ou maior.',
  'The target VM NSG must allow inbound 3389/22 FROM the Bastion subnet.':
    'O NSG da VM de destino precisa permitir a entrada nas portas 3389/22 A PARTIR da sub-rede do Bastion.',
  'The user resolves your hostname to the closest edge POP. The edge applies WAF and caching rules, then forwards over the Microsoft backbone to the healthiest origin.':
    'O usuário resolve o seu nome de host para o POP de borda mais próximo. A borda aplica as regras de WAF e de cache e depois encaminha pelo backbone da Microsoft até a origem mais íntegra.',
  'This represents the customer network outside Azure — a corporate datacenter, branch office, or another cloud.':
    'Isso representa a rede do cliente fora do Azure: um datacenter corporativo, uma filial ou outra nuvem.',
  'Traffic Manager is DNS-based global load balancing — it answers DNS queries with the endpoint you should use.':
    'O Gerenciador de Tráfego é um balanceamento de carga global baseado em DNS: ele responde às consultas DNS com o ponto de extremidade que você deve usar.',
  'Traffic is steered to it with a UDR. For high availability it sits behind an internal load balancer, and its NIC must have IP forwarding enabled.':
    'O tráfego é direcionado a ele por uma UDR. Para alta disponibilidade, ele fica atrás de um balanceador de carga interno, e a NIC dele precisa ter o encaminhamento IP habilitado.',
  'Traffic is steered to it with a User-Defined Route pointing at its private IP. Rules are evaluated in order: DNAT, then network rules, then application rules.':
    'O tráfego é direcionado a ele por uma rota definida pelo usuário que aponta para o IP privado dele. As regras são avaliadas na ordem: DNAT, depois regras de rede e por fim regras de aplicativo.',
  'Treat it like any other hop: confirm what it listens on, what it forwards to, and who controls its rules.':
    'Trate-o como qualquer outro salto: confirme em que ele escuta, para onde ele encaminha e quem controla as regras dele.',
  'Use Effective security rules on the NIC — that shows the merged subnet + NIC result, which is what actually applies.':
    'Use as regras de segurança efetivas na NIC: elas mostram o resultado combinado de sub-rede e NIC, que é o que realmente se aplica.',
  'Use effective routes on a workload NIC to prove the on-premises prefixes really arrived.':
    'Use as rotas efetivas em uma NIC de carga de trabalho para comprovar que os prefixos locais realmente chegaram.',
  'Used as a generic actor when the exact device does not matter.':
    'Usado como ator genérico quando o dispositivo exato não importa.',
  'VNet connections, VPN sites, and ExpressRoute circuits attach to the hub, and hub route tables control who can reach whom.':
    'Conexões de VNet, sites VPN e circuitos do ExpressRoute se conectam ao hub, e as tabelas de rotas do hub controlam quem pode alcançar quem.',
  'VNet-deployed container groups need a delegated subnet.':
    'Os grupos de contêineres implantados em uma VNet precisam de uma sub-rede delegada.',
  'VNet-injected APIM requires specific inbound NSG rules; missing them makes the service unhealthy.':
    'O APIM injetado em VNet exige regras de NSG de entrada específicas; sem elas, o serviço fica não íntegro.',
  'Verify the SKU supports the tunnel count and throughput you need.':
    'Verifique se a SKU dá suporte ao número de túneis e à taxa de transferência necessários.',
  'Verify the VNet address space does not overlap with any peered VNet or the on-premises network.':
    'Verifique se o espaço de endereços da VNet não se sobrepõe ao de nenhuma VNet emparelhada nem ao da rede local.',
  'Verify the downstream party has allow-listed the whole prefix, not one address from it.':
    'Verifique se a parte receptora incluiu na lista de permissões o prefixo inteiro, e não apenas um endereço dele.',
  'Verify the target on-premises DNS server actually answers queries from the Azure source range.':
    'Verifique se o servidor DNS local de destino realmente responde às consultas vindas do intervalo de origem do Azure.',
  'Verify you have not hit a subscription-level quota (public IPs, VNet peerings, gateway count).':
    'Verifique se você não atingiu alguma cota no nível da assinatura (IPs públicos, emparelhamentos de VNet, número de gateways).',
  'Virtual WAN is a managed networking service that provides a global transit hub-and-spoke backbone.':
    'A WAN Virtual é um serviço de rede gerenciado que fornece um backbone global de trânsito hub-and-spoke.',
  'Watch for overlapping address space between on-premises and the Azure VNet — that breaks routing.':
    'Fique atento à sobreposição de espaço de endereços entre o ambiente local e a VNet do Azure: isso quebra o roteamento.',
  'You assign NICs to the ASG, then reference the ASG as the source or destination in NSG rules.':
    'Você atribui NICs ao ASG e depois referencia o ASG como origem ou destino nas regras de NSG.',
  'You create hubs per region and connect VNets, branches (VPN), and ExpressRoute circuits to them. Microsoft handles the any-to-any routing between hubs.':
    'Você cria hubs por região e conecta a eles VNets, filiais (VPN) e circuitos do ExpressRoute. A Microsoft cuida do roteamento de todos para todos entre os hubs.',
  'You need it whenever traffic must take a path Azure would not choose on its own — for example forcing all egress through a firewall or NVA.':
    'Você precisa dela sempre que o tráfego tiver de seguir um caminho que o Azure não escolheria sozinho, por exemplo forçar toda a saída por um firewall ou NVA.',
  'Zone-redundant vs zonal matters for availability during a zone outage.':
    'A diferença entre redundante de zona e zonal é importante para a disponibilidade durante uma interrupção de zona.',
};

const fr: Dict = {
  'A 0.0.0.0/0 route with next hop None or a stale appliance IP blackholes all outbound traffic.':
    'Une route 0.0.0.0/0 dont le saut suivant est None ou pointe vers l’IP obsolète d’un appliance fait disparaître tout le trafic sortant.',
  'A 403 is authorisation (RBAC or access policy); a connection timeout is network.':
    'Un 403 relève de l’autorisation (RBAC ou stratégie d’accès) ; un délai d’attente de connexion relève du réseau.',
  'A 403 usually means authorisation or firewall; a name-resolution failure means DNS.':
    'Un 403 indique généralement l’autorisation ou le pare-feu ; un échec de résolution de noms indique le DNS.',
  'A Connection is the resource that pairs an Azure gateway with the remote side — a Local Network Gateway, another VNet gateway, or an ExpressRoute circuit.':
    'Une connexion est la ressource qui associe une passerelle Azure au côté distant : une passerelle de réseau local, une autre passerelle de VNet ou un circuit ExpressRoute.',
  'A DDoS Protection plan adds always-on traffic monitoring and adaptive mitigation for public IPs in protected VNets.':
    'Un plan Protection DDoS ajoute une surveillance permanente du trafic et une atténuation adaptative pour les IP publiques des VNets protégés.',
  'A DNS zone holds the records that translate names into IP addresses. A Private DNS Zone is only visible to VNets that are linked to it.':
    'Une zone DNS contient les enregistrements qui traduisent les noms en adresses IP. Une zone DNS privée n’est visible que par les VNets qui y sont liés.',
  'A Function App runs small pieces of event-driven code, billed by execution.':
    'Une application de fonctions exécute de petits morceaux de code pilotés par événements, facturés à l’exécution.',
  'A Local Network Gateway is the Azure object that describes your on-premises VPN device — its public IP and the prefixes behind it.':
    'Une passerelle de réseau local est l’objet Azure qui décrit votre équipement VPN local : son IP publique et les préfixes situés derrière.',
  'A NIC is the virtual network adapter that attaches a VM to a subnet and holds its private IP.':
    'Une carte réseau est l’adaptateur réseau virtuel qui rattache une machine virtuelle à un sous-réseau et porte son IP privée.',
  'A Private DNS Zone is linked to one or more VNets. With auto-registration enabled, VMs in a linked VNet register their own records.':
    'Une zone DNS privée est liée à un ou plusieurs VNets. Avec l’enregistrement automatique activé, les machines virtuelles d’un VNet lié enregistrent elles-mêmes leurs enregistrements.',
  'A Private Endpoint is a NIC in your subnet that holds a private IP mapped to a specific PaaS resource.':
    'Un point de terminaison privé est une carte réseau dans votre sous-réseau qui porte une IP privée mappée à une ressource PaaS précise.',
  'A Public IP Prefix is a contiguous block of public addresses reserved for your subscription.':
    'Un préfixe d’IP publique est un bloc contigu d’adresses publiques réservé à votre abonnement.',
  'A Public IP is an internet-routable address assigned to a gateway, load balancer, firewall, or VM NIC.':
    'Une IP publique est une adresse routable sur Internet affectée à une passerelle, un équilibreur de charge, un pare-feu ou une carte réseau de machine virtuelle.',
  'A Scale Set manages an identical group of VMs that grows and shrinks automatically.':
    'Un groupe identique gère un ensemble de machines virtuelles identiques qui s’étend et se réduit automatiquement.',
  'A Storage Account holds blobs, files, queues, and tables behind a public hostname per service.':
    'Un compte de stockage contient des objets blob, des fichiers, des files d’attente et des tables derrière un nom d’hôte public par service.',
  'A VPN Gateway terminates encrypted IPsec/IKE tunnels between Azure and an on-premises device or remote user.':
    'Une passerelle VPN termine des tunnels chiffrés IPsec/IKE entre Azure et un équipement local ou un utilisateur distant.',
  'A Virtual Machine is a server you run in Azure, with its own operating system and applications.':
    'Une machine virtuelle est un serveur que vous exécutez dans Azure, avec son propre système d’exploitation et ses applications.',
  'A Virtual Network is your private, isolated network in Azure, defined by one or more address ranges (CIDR blocks).':
    'Un réseau virtuel est votre réseau privé et isolé dans Azure, défini par une ou plusieurs plages d’adresses (blocs CIDR).',
  'A Virtual WAN hub is the Microsoft-managed regional hub VNet that spokes and branches connect into.':
    'Un hub Virtual WAN est le VNet hub régional géré par Microsoft auquel se connectent les rayons et les succursales.',
  'A WAF policy is the rule set that inspects HTTP requests for common web attacks such as SQL injection and cross-site scripting.':
    'Une stratégie WAF est le jeu de règles qui inspecte les requêtes HTTP à la recherche d’attaques web courantes comme l’injection SQL et le script intersite.',
  'A client application or device making the request.':
    'Une application cliente ou un appareil qui émet la requête.',
  'A command-line session such as PowerShell, Bash, or Azure CLI.':
    'Une session en ligne de commande telle que PowerShell, Bash ou Azure CLI.',
  'A custom element added to represent something outside the standard Azure resource set.':
    'Un élément personnalisé ajouté pour représenter quelque chose en dehors de l’ensemble standard de ressources Azure.',
  'A legitimate request being blocked shows up as a 403 — check the WAF logs for the triggering rule ID and add an exclusion.':
    'Une requête légitime bloquée apparaît sous la forme d’un 403 : consultez les journaux du WAF pour repérer l’ID de la règle déclenchée et ajoutez une exclusion.',
  'A listener accepts the request on the front-end IP, a rule matches it, and the request is forwarded to a backend pool member that the health probe reports as healthy.':
    'Un écouteur accepte la requête sur l’IP frontale, une règle la met en correspondance, puis la requête est transmise à un membre du pool principal que la sonde d’intégrité déclare sain.',
  'A load-balancing rule maps a front-end IP and port to a backend pool and port. It does not inspect or modify the payload, so it cannot route by URL.':
    'Une règle d’équilibrage de charge associe une IP et un port frontaux à un pool et un port principaux. Elle n’inspecte ni ne modifie la charge utile, elle ne peut donc pas router par URL.',
  'A missing or wrong prefix here is the single most common cause of "the tunnel is up but traffic does not pass".':
    'Un préfixe manquant ou incorrect ici est de loin la cause la plus fréquente du « le tunnel est monté mais le trafic ne passe pas ».',
  'A mobile device acting as the client.': 'Un appareil mobile jouant le rôle de client.',
  'A person or role involved in the flow.': 'Une personne ou un rôle impliqué dans le flux.',
  'A portal error is control plane (ARM, RBAC, policy) — it is not evidence of a data-path problem.':
    'Une erreur du portail relève du plan de contrôle (ARM, RBAC, stratégie) : ce n’est pas la preuve d’un problème sur le chemin de données.',
  'A resource group is a logical container that holds related Azure resources.':
    'Un groupe de ressources est un conteneur logique qui regroupe des ressources Azure liées entre elles.',
  'A resource group is a management construct only — it does not affect network reachability. Two resources in different resource groups talk to each other normally.':
    'Un groupe de ressources est uniquement une construction de gestion : il n’affecte pas l’accessibilité réseau. Deux ressources dans des groupes différents communiquent normalement.',
  'A route table holds User-Defined Routes that override the routes Azure creates by default.':
    'Une table de routage contient des itinéraires définis par l’utilisateur qui remplacent les itinéraires créés par défaut par Azure.',
  'A server — typically an on-premises or third-party host outside Azure.':
    'Un serveur, généralement un hôte local ou tiers en dehors d’Azure.',
  'A subnet is a slice of the VNet address space where resources actually get their IP addresses.':
    'Un sous-réseau est une portion de l’espace d’adressage du VNet où les ressources obtiennent réellement leurs adresses IP.',
  'A subscription is the billing and quota boundary that resources are created in.':
    'Un abonnement est la limite de facturation et de quota dans laquelle les ressources sont créées.',
  'A user laptop or workstation.': 'Un ordinateur portable ou un poste de travail utilisateur.',
  'AKS is managed Kubernetes — Azure runs the control plane and you run workloads in node pools.':
    'AKS est un Kubernetes managé : Azure exécute le plan de contrôle et vous exécutez les charges de travail dans des pools de nœuds.',
  'API Management is a gateway that publishes, secures, and throttles APIs.':
    'API Management est une passerelle qui publie, sécurise et limite les API.',
  'Access can be restricted with the firewall and virtual network rules, or made fully private with a Private Endpoint per sub-resource (blob, file, and so on).':
    'L’accès peut être restreint par le pare-feu et les règles de réseau virtuel, ou rendu totalement privé grâce à un point de terminaison privé par sous-ressource (blob, fichier, etc.).',
  'Admins usually reach resources through the Azure portal, Bastion, or a jump host rather than the application front door.':
    'Les administrateurs atteignent généralement les ressources via le portail Azure, Bastion ou un hôte de rebond, et non par la porte d’entrée applicative.',
  'An ASG is a label you attach to NICs so NSG rules can target a workload role instead of IP addresses.':
    'Un ASG est une étiquette que vous attachez aux cartes réseau afin que les règles NSG ciblent un rôle de charge de travail plutôt que des adresses IP.',
  'An Azure region is a set of datacenters in one geography that hosts your resources.':
    'Une région Azure est un ensemble de centres de données situés dans une même zone géographique et qui héberge vos ressources.',
  'An ExpressRoute Gateway is the VNet-side endpoint that attaches a VNet to an ExpressRoute circuit.':
    'Une passerelle ExpressRoute est le point de terminaison côté VNet qui rattache un VNet à un circuit ExpressRoute.',
  'An ExpressRoute circuit is a private Layer-3 connection between your network and Microsoft, provided by a connectivity partner.':
    'Un circuit ExpressRoute est une connexion privée de couche 3 entre votre réseau et Microsoft, fournie par un partenaire de connectivité.',
  'An INBOUND endpoint gives on-premises an IP in Azure to forward queries to. An OUTBOUND endpoint plus a forwarding ruleset sends Azure queries for specific domains to on-premises DNS servers.':
    'Un point de terminaison ENTRANT fournit au site local une IP dans Azure vers laquelle transférer les requêtes. Un point de terminaison SORTANT associé à un jeu de règles de transfert envoie les requêtes Azure de domaines précis vers les serveurs DNS locaux.',
  'An IP Group is a named, reusable collection of IP addresses and ranges.':
    'Un groupe IP est une collection nommée et réutilisable d’adresses et de plages IP.',
  'An NSG and a route table are attached at the subnet level, so every resource in the subnet inherits those rules. Some services require a dedicated, specially-named subnet (for example GatewaySubnet, AzureFirewallSubnet, AzureBastionSubnet).':
    'Un NSG et une table de routage sont attachés au niveau du sous-réseau, si bien que chaque ressource du sous-réseau hérite de ces règles. Certains services exigent un sous-réseau dédié portant un nom précis (par exemple GatewaySubnet, AzureFirewallSubnet, AzureBastionSubnet).',
  'An NSG is a stateful packet filter with allow and deny rules based on source, destination, port, and protocol.':
    'Un NSG est un filtre de paquets avec état, doté de règles d’autorisation et de refus fondées sur la source, la destination, le port et le protocole.',
  'An NVA is a third-party firewall, router, or proxy running as a VM inside your VNet.':
    'Un NVA est un pare-feu, routeur ou proxy tiers exécuté comme machine virtuelle à l’intérieur de votre VNet.',
  'An administrator performing management or troubleshooting work.':
    'Un administrateur effectuant des tâches d’administration ou de dépannage.',
  'An image pull failure over Private Link is nearly always DNS — verify the registry name resolves to the private IP.':
    'Un échec d’extraction d’image via Private Link relève presque toujours du DNS : vérifiez que le nom du registre se résout vers l’IP privée.',
  'App Service is a managed platform for hosting web apps and APIs without managing servers.':
    'App Service est une plateforme managée pour héberger des applications web et des API sans gérer de serveurs.',
  'Application Gateway for Containers is the Kubernetes-native Layer-7 ingress built on the Application Gateway platform.':
    'Application Gateway for Containers est l’entrée de couche 7 native Kubernetes bâtie sur la plateforme Application Gateway.',
  'Application Gateway is a regional Layer-7 (HTTP/HTTPS) load balancer.':
    'Application Gateway est un équilibreur de charge régional de couche 7 (HTTP/HTTPS).',
  'Application rules need the FQDN; if the client resolves DNS differently, the rule will not match.':
    'Les règles applicatives ont besoin du FQDN ; si le client résout le DNS différemment, la règle ne correspondra pas.',
  'Asymmetric routing is a classic failure — the return path must also traverse the firewall.':
    'Le routage asymétrique est une panne classique : le chemin de retour doit lui aussi traverser le pare-feu.',
  'Azure Bastion is a managed jump host that gives browser-based RDP and SSH access to VMs.':
    'Azure Bastion est un hôte de rebond managé qui offre un accès RDP et SSH aux machines virtuelles depuis le navigateur.',
  'Azure Container Registry stores and serves your container images.':
    'Azure Container Registry stocke et distribue vos images de conteneur.',
  'Azure Firewall is a managed, stateful network firewall that inspects traffic against DNAT, network, and application rules.':
    'Azure Firewall est un pare-feu réseau managé et avec état qui inspecte le trafic au regard de règles DNAT, réseau et applicatives.',
  'Azure Firewall rules reference the IP Group by name in the source or destination field.':
    'Les règles Azure Firewall référencent le groupe IP par son nom dans le champ source ou destination.',
  'Azure Load Balancer is a Layer-4 (TCP/UDP) load balancer that spreads connections across a backend pool.':
    'Azure Load Balancer est un équilibreur de charge de couche 4 (TCP/UDP) qui répartit les connexions sur un pool principal.',
  'Azure SQL Database is a managed relational database service.':
    'Azure SQL Database est un service de base de données relationnelle managé.',
  'Azure needs to know which address ranges live on the far side of the tunnel so it can route to them.':
    'Azure doit savoir quelles plages d’adresses se trouvent de l’autre côté du tunnel afin de pouvoir router vers elles.',
  'Azure protects its platform by default, but a Network Protection plan tunes mitigation to YOUR traffic and adds attack telemetry plus cost protection.':
    'Azure protège sa plateforme par défaut, mais un plan de protection réseau adapte l’atténuation à VOTRE trafic et ajoute une télémétrie des attaques ainsi qu’une protection des coûts.',
  'Because it is DNS-based, client-side DNS caching and TTL delay failover — check the TTL.':
    'Comme il repose sur le DNS, la mise en cache DNS côté client et la durée de vie retardent le basculement : vérifiez la TTL.',
  'Both the source and destination ASG must be in the SAME virtual network for a rule to work.':
    'Pour qu’une règle fonctionne, l’ASG source et l’ASG de destination doivent se trouver dans le MÊME réseau virtuel.',
  'Caching can mask a backend change — purge before concluding the backend is wrong.':
    'La mise en cache peut masquer une modification du back-end : videz-la avant de conclure que le back-end est en cause.',
  'Capture the exact command and full error text — it usually names the failing endpoint and port.':
    'Capturez la commande exacte et le texte complet de l’erreur : il indique généralement le point de terminaison et le port en échec.',
  'Check BGP session state and the advertised/received route counts on each peering.':
    'Vérifiez l’état de la session BGP ainsi que le nombre d’itinéraires annoncés et reçus sur chaque peering.',
  'Check DDoS mitigation metrics before assuming an outage is application-side.':
    'Vérifiez les métriques d’atténuation DDoS avant de supposer que la panne vient de l’application.',
  'Check SNAT port utilisation metrics if outbound connections start failing intermittently.':
    'Vérifiez les métriques d’utilisation des ports SNAT si les connexions sortantes commencent à échouer par intermittence.',
  'Check backend health first — an unhealthy pool returns 502.':
    'Vérifiez d’abord l’intégrité du back-end : un pool non sain renvoie un 502.',
  'Check connection status and the ingress/egress byte counters — zero bytes with a Connected state points at routing, not the tunnel.':
    'Vérifiez l’état de la connexion et les compteurs d’octets entrants et sortants : zéro octet avec un état Connecté oriente vers le routage, pas vers le tunnel.',
  'Check container logs and restart count first — an app crash looks like a network failure from outside.':
    'Vérifiez d’abord les journaux du conteneur et le nombre de redémarrages : vu de l’extérieur, un plantage applicatif ressemble à une panne réseau.',
  'Check effective routes and effective security rules on the NIC.':
    'Vérifiez les itinéraires effectifs et les règles de sécurité effectives sur la carte réseau.',
  'Check effective routes on a NIC in this VNet to see what next hop Azure is actually using.':
    'Vérifiez les itinéraires effectifs d’une carte réseau de ce VNet pour voir quel saut suivant Azure utilise réellement.',
  'Check effective routes on the NIC — that is the ground truth, not the route table definition.':
    'Vérifiez les itinéraires effectifs sur la carte réseau : c’est la réalité, pas la définition de la table de routage.',
  'Check endpoint monitor status; an endpoint marked Degraded is removed from responses.':
    'Vérifiez l’état de surveillance du point de terminaison ; un point marqué Dégradé est retiré des réponses.',
  'Check for a delete lock or Azure Policy assignment at this scope if a deployment is failing.':
    'Si un déploiement échoue, vérifiez la présence d’un verrou de suppression ou d’une attribution Azure Policy à cette étendue.',
  'Check for asymmetric routing — both directions must traverse the same appliance instance.':
    'Recherchez un routage asymétrique : les deux sens doivent traverser la même instance d’appliance.',
  'Check health probe status — if every instance is unhealthy the load balancer silently drops traffic.':
    'Vérifiez l’état de la sonde d’intégrité : si toutes les instances sont non saines, l’équilibreur de charge supprime le trafic sans avertissement.',
  'Check hub routing status and the effective routes for the connection in question.':
    'Vérifiez l’état de routage du hub et les itinéraires effectifs de la connexion concernée.',
  'Check origin health probes and the origin host header setting — a mismatch causes 4xx from the origin.':
    'Vérifiez les sondes d’intégrité de l’origine et le paramètre d’en-tête d’hôte d’origine : une discordance provoque des erreurs 4xx depuis l’origine.',
  'Check priority ordering — a broad deny in a parent policy silently overrides a child allow.':
    'Vérifiez l’ordre des priorités : un refus large dans une stratégie parente écrase silencieusement une autorisation enfant.',
  'Check that the on-premises prefixes are present in the Local Network Gateway (or advertised via BGP).':
    'Vérifiez que les préfixes locaux sont présents dans la passerelle de réseau local (ou annoncés via BGP).',
  'Check that the on-premises router actually advertises the local prefixes, and that it learns the Azure address space.':
    'Vérifiez que le routeur local annonce réellement les préfixes locaux et qu’il apprend l’espace d’adressage Azure.',
  'Check the A record exists and points at the expected IP.':
    'Vérifiez que l’enregistrement A existe et pointe vers l’IP attendue.',
  'Check the ALB controller pod logs in the cluster.':
    'Consultez les journaux du pod contrôleur ALB dans le cluster.',
  'Check the NSG attached to this subnet — subnet rules are evaluated before NIC rules for inbound traffic.':
    'Vérifiez le NSG attaché à ce sous-réseau : pour le trafic entrant, les règles de sous-réseau sont évaluées avant celles de la carte réseau.',
  'Check the connection state is Approved, not Pending.':
    'Vérifiez que l’état de la connexion est Approuvé et non En attente.',
  'Check the default rules — DenyAllInbound at priority 65500 catches anything you did not explicitly allow.':
    'Vérifiez les règles par défaut : DenyAllInbound, à la priorité 65500, capture tout ce que vous n’avez pas explicitement autorisé.',
  'Check the effective routes on the hub route table, not just on the spoke.':
    'Vérifiez les itinéraires effectifs sur la table de routage du hub, et pas seulement sur le rayon.',
  'Check the firewall logs for the specific flow — they tell you which rule allowed or denied it.':
    'Consultez les journaux du pare-feu pour ce flux précis : ils indiquent quelle règle l’a autorisé ou refusé.',
  'Check the forwarding ruleset is linked to the VNet, and that the rule domain name ends with a trailing dot.':
    'Vérifiez que le jeu de règles de transfert est lié au VNet et que le nom de domaine de la règle se termine par un point final.',
  'Check the number of routes learned — exceeding the route limit drops the BGP session.':
    'Vérifiez le nombre d’itinéraires appris : dépasser la limite fait tomber la session BGP.',
  'Check the policy trace for the failing call — the answer is usually a policy, not the network.':
    'Consultez la trace de stratégie de l’appel en échec : la réponse se trouve généralement dans une stratégie, pas dans le réseau.',
  'Check the route on the server itself — it must know to send the Azure prefixes to the tunnel.':
    'Vérifiez l’itinéraire sur le serveur lui-même : il doit savoir qu’il faut envoyer les préfixes Azure vers le tunnel.',
  'Check the route table attached to this subnet for a UDR that overrides the default system route.':
    'Vérifiez dans la table de routage attachée à ce sous-réseau la présence d’une UDR qui remplace l’itinéraire système par défaut.',
  'Check the service is actually available in this region (some SKUs are region-limited).':
    'Vérifiez que le service est réellement disponible dans cette région (certaines références sont limitées à certaines régions).',
  'Check the service type — ClusterIP is cluster-internal only, LoadBalancer creates an Azure load balancer.':
    'Vérifiez le type de service : ClusterIP est interne au cluster uniquement, tandis que LoadBalancer crée un équilibreur de charge Azure.',
  'Check what the client resolves the name to, and from which network it is connecting.':
    'Vérifiez vers quoi le client résout le nom et depuis quel réseau il se connecte.',
  'Check whether Access Restrictions are blocking the caller.':
    'Vérifiez si les restrictions d’accès bloquent l’appelant.',
  'Check whether the client is on the corporate network, on VPN, or on the public internet, because the path differs.':
    'Vérifiez si le client se trouve sur le réseau d’entreprise, sur le VPN ou sur Internet public, car le chemin diffère.',
  'Check whether unhealthy instances are being rolled — an instance can be up but failing its probe.':
    'Vérifiez si des instances non saines sont en cours de remplacement : une instance peut être active tout en échouant à sa sonde.',
  'Circuits are redundant by design — verify BOTH links, not just the primary.':
    'Les circuits sont redondants par conception : vérifiez LES DEUX liaisons, pas seulement la principale.',
  'Client-side caching can hide a fix — flush the resolver cache before retesting.':
    'Le cache côté client peut masquer un correctif : videz le cache du résolveur avant de retester.',
  'Compare a lookup and a connection test from the laptop against the same test run inside Azure.':
    'Comparez une résolution de nom et un test de connexion depuis l’ordinateur portable avec le même test exécuté dans Azure.',
  'Compare the IPsec policy on this connection with the on-premises configuration line by line.':
    'Comparez ligne par ligne la stratégie IPsec de cette connexion avec la configuration locale.',
  'Compute platforms need somewhere private and close to pull images from at deployment time.':
    'Les plateformes de calcul ont besoin d’un emplacement privé et proche depuis lequel extraire les images au moment du déploiement.',
  'Confirm IP forwarding is enabled if this NIC belongs to an NVA that must route traffic for others.':
    'Vérifiez que le transfert IP est activé si cette carte réseau appartient à un NVA qui doit router le trafic pour d’autres.',
  'Confirm a UDR actually forces the traffic through the firewall; without it traffic bypasses the firewall entirely.':
    'Vérifiez qu’une UDR force réellement le trafic à passer par le pare-feu ; sans elle, le trafic le contourne entièrement.',
  'Confirm a virtual network link exists between the zone and the client VNet — without it the zone is invisible.':
    'Vérifiez qu’un lien de réseau virtuel existe entre la zone et le VNet du client : sans lui, la zone est invisible.',
  'Confirm backend certificate validation settings if the backend uses a private CA.':
    'Vérifiez les paramètres de validation du certificat back-end si le back-end utilise une autorité de certification privée.',
  'Confirm both sides of the flow are in the region you expect — cross-region hops add latency and egress charges.':
    'Vérifiez que les deux extrémités du flux se trouvent dans la région attendue : les sauts entre régions ajoutent de la latence et des frais de sortie.',
  'Confirm the NIC really is a member — an unassigned NIC silently falls through to the deny rule.':
    'Vérifiez que la carte réseau est réellement membre : une carte non affectée retombe silencieusement sur la règle de refus.',
  'Confirm the NSG on the Application Gateway subnet allows the required inbound ports from the GatewayManager service tag.':
    'Vérifiez que le NSG du sous-réseau Application Gateway autorise les ports entrants requis depuis la balise de service GatewayManager.',
  'Confirm the NSG on the backend NICs or subnet allows the probe source (AzureLoadBalancer service tag) and the data port.':
    'Vérifiez que le NSG des cartes réseau back-end ou du sous-réseau autorise la source de la sonde (balise de service AzureLoadBalancer) et le port de données.',
  'Confirm the Private DNS Zone is linked to the VNet the client sits in, and that the A record exists.':
    'Vérifiez que la zone DNS privée est liée au VNet dans lequel se trouve le client et que l’enregistrement A existe.',
  'Confirm the UDR next hop points at the NVA private IP (or the internal load balancer front end for an HA pair).':
    'Vérifiez que le saut suivant de l’UDR pointe vers l’IP privée du NVA (ou vers le frontal de l’équilibreur de charge interne pour une paire haute disponibilité).',
  'Confirm the VNet DNS setting (Azure-provided vs custom DNS servers) matches what the workload expects.':
    'Vérifiez que le paramètre DNS du VNet (DNS fourni par Azure ou serveurs DNS personnalisés) correspond à ce qu’attend la charge de travail.',
  'Confirm the VNet connection propagates to, and associates with, the route tables you expect.':
    'Vérifiez que la connexion de VNet se propage vers les tables de routage attendues et s’y associe.',
  'Confirm the VNet is actually associated with the plan.':
    'Vérifiez que le VNet est réellement associé au plan.',
  'Confirm the address is actually associated with the resource you think it is.':
    'Vérifiez que l’adresse est réellement associée à la ressource que vous imaginez.',
  'Confirm the address you expect is really in the group — a missing entry looks exactly like a firewall deny.':
    'Vérifiez que l’adresse attendue figure vraiment dans le groupe : une entrée manquante ressemble exactement à un refus du pare-feu.',
  'Confirm the admin path (Bastion, VPN, or portal) separately — it can fail while the app path works.':
    'Vérifiez séparément le chemin d’administration (Bastion, VPN ou portail) : il peut échouer alors que le chemin applicatif fonctionne.',
  'Confirm the application is actually listening on the expected port (netstat or ss).':
    'Vérifiez que l’application écoute réellement sur le port attendu (netstat ou ss).',
  'Confirm the association subnet is delegated correctly and has free addresses.':
    'Vérifiez que le sous-réseau d’association est correctement délégué et dispose d’adresses libres.',
  'Confirm the circuit status is Provisioned and the peering is configured on both the provider and Microsoft side.':
    'Vérifiez que l’état du circuit est Provisionné et que le peering est configuré côté fournisseur et côté Microsoft.',
  'Confirm the consumer connection request has been approved.':
    'Vérifiez que la demande de connexion du consommateur a été approuvée.',
  'Confirm the gateway SKU supports the required throughput and the number of circuit connections.':
    'Vérifiez que la référence de la passerelle prend en charge le débit requis et le nombre de connexions de circuit.',
  'Confirm the local firewall and any host-based firewall permit the flow in both directions.':
    'Vérifiez que le pare-feu local et tout pare-feu hébergé sur l’hôte autorisent le flux dans les deux sens.',
  'Confirm the on-premises conditional forwarder points at the inbound endpoint IP, and that UDP and TCP port 53 are open across the tunnel.':
    'Vérifiez que le redirecteur conditionnel local pointe vers l’IP du point de terminaison entrant et que le port 53 UDP et TCP est ouvert à travers le tunnel.',
  'Confirm the on-premises firewall permits the required ports in BOTH directions.':
    'Vérifiez que le pare-feu local autorise les ports requis dans LES DEUX sens.',
  'Confirm the origin only accepts traffic from Front Door (X-Azure-FDID header or the AzureFrontDoor.Backend service tag).':
    'Vérifiez que l’origine n’accepte que le trafic provenant de Front Door (en-tête X-Azure-FDID ou balise de service AzureFrontDoor.Backend).',
  'Confirm the hosting plan supports the networking feature you need — the classic Consumption plan has no VNet integration, while Flex Consumption and Premium do.': 'Vérifiez que le plan d’hébergement prend en charge la fonctionnalité réseau dont vous avez besoin : le plan Consumption classique n’a pas d’intégration au VNet, contrairement à Flex Consumption et Premium.',
  'Confirm the policy is actually associated with the firewall handling this traffic.':
    'Vérifiez que la stratégie est réellement associée au pare-feu qui traite ce trafic.',
  'Confirm the public IP matches the on-premises device address seen from the internet after NAT.':
    'Vérifiez que l’IP publique correspond à l’adresse de l’équipement local vue depuis Internet après NAT.',
  'Confirm the pulling identity has the AcrPull role.':
    'Vérifiez que l’identité qui effectue l’extraction possède le rôle AcrPull.',
  'Confirm the server firewall rules or Private Endpoint permit the client.':
    'Vérifiez que les règles de pare-feu du serveur ou le point de terminaison privé autorisent le client.',
  'Confirm the subnet has enough free addresses for the maximum pods per node under Azure CNI.':
    'Vérifiez que le sous-réseau dispose d’assez d’adresses libres pour le nombre maximal de pods par nœud avec Azure CNI.',
  'Confirm the subnet is large enough — Azure reserves 5 addresses in every subnet.':
    'Vérifiez que le sous-réseau est assez grand : Azure réserve 5 adresses dans chaque sous-réseau.',
  'Confirm the tunnel is Connected, not just Provisioned.':
    'Vérifiez que le tunnel est Connecté, et pas seulement Provisionné.',
  'Confirm the upgrade policy is not mid-rollout when investigating inconsistent behaviour.':
    'Lorsque vous analysez un comportement incohérent, vérifiez que la stratégie de mise à niveau n’est pas en cours de déploiement.',
  'Confirm what the client actually resolves the name to — a wrong DNS answer sends traffic to the wrong place.':
    'Vérifiez vers quoi le client résout réellement le nom : une mauvaise réponse DNS envoie le trafic au mauvais endroit.',
  'Confirm whether the policy is in Detection or Prevention mode before concluding it is not the cause.':
    'Vérifiez si la stratégie est en mode Détection ou Prévention avant de conclure qu’elle n’est pas en cause.',
  'Consumers create a Private Endpoint that requests a connection; you approve it. Traffic arrives with the source NAT applied by the platform.':
    'Les consommateurs créent un point de terminaison privé qui demande une connexion, et vous l’approuvez. Le trafic arrive avec la NAT source appliquée par la plateforme.',
  'Container Instances runs a single container without any cluster to manage.':
    'Container Instances exécute un conteneur unique sans aucun cluster à gérer.',
  'Cosmos DB is a globally distributed NoSQL database with low-latency reads and writes.':
    'Cosmos DB est une base de données NoSQL distribuée à l’échelle mondiale, avec des lectures et des écritures à faible latence.',
  'Cross-subscription peering and Private Link need permissions in BOTH subscriptions.':
    'Le peering entre abonnements et Private Link nécessitent des autorisations dans LES DEUX abonnements.',
  'Customers use one when they need a specific vendor feature set, or want the same appliance on-premises and in Azure.':
    'Les clients en utilisent un lorsqu’ils ont besoin des fonctionnalités propres à un éditeur ou souhaitent le même appliance en local et dans Azure.',
  'DNS Private Resolver is a managed service that resolves DNS between on-premises and Azure without you running DNS server VMs.':
    'DNS Private Resolver est un service managé qui résout le DNS entre le site local et Azure sans que vous ayez à exécuter des machines virtuelles serveur DNS.',
  'DNS is the number-one cause of failure — run a lookup from the client and confirm it returns the private IP, not the public one.':
    'Le DNS est la première cause de panne : effectuez une résolution depuis le client et vérifiez qu’elle renvoie l’IP privée et non la publique.',
  'Direct mode needs TCP 10250-10255 and 10000-20000 open; gateway mode only needs 443.':
    'Le mode direct nécessite l’ouverture des ports TCP 10250-10255 et 10000-20000 ; le mode passerelle n’a besoin que du 443.',
  'Each sub-resource needs its OWN Private Endpoint and its own privatelink DNS zone.':
    'Chaque sous-ressource nécessite SON PROPRE point de terminaison privé et sa propre zone DNS privatelink.',
  'Effective routes and effective security rules are both read from the NIC — always start here.':
    'Les itinéraires effectifs comme les règles de sécurité effectives se lisent sur la carte réseau : commencez toujours par là.',
  'Enable VNet flow logs for a historical record of allow and deny decisions.':
    'Activez les journaux de flux du VNet pour disposer d’un historique des décisions d’autorisation et de refus.',
  'Every traffic flow needs an origin — this is the person or application whose experience you are troubleshooting.':
    'Tout flux de trafic a besoin d’une origine : il s’agit de la personne ou de l’application dont vous analysez l’expérience.',
  'Everything drawn inside this boundary is deployed in the same region, so traffic between those resources stays on the regional network rather than crossing the internet.':
    'Tout ce qui est dessiné à l’intérieur de cette limite est déployé dans la même région ; le trafic entre ces ressources reste donc sur le réseau régional au lieu de traverser Internet.',
  'Firewall Policy is the reusable rule container that one or more Azure Firewalls apply.':
    'La stratégie de pare-feu est le conteneur de règles réutilisable qu’appliquent un ou plusieurs Azure Firewall.',
  'For Private Endpoints, the zone name must match the required pattern exactly (for example privatelink.blob.core.windows.net).':
    'Pour les points de terminaison privés, le nom de la zone doit correspondre exactement au modèle requis (par exemple privatelink.blob.core.windows.net).',
  'For Standard SKU, remember inbound is closed by default until an NSG rule opens it.':
    'Avec la référence Standard, rappelez-vous que le trafic entrant est fermé par défaut jusqu’à ce qu’une règle NSG l’ouvre.',
  'For TLS errors, check certificate expiry, chain, and whether the backend hostname matches the certificate.':
    'Pour les erreurs TLS, vérifiez l’expiration du certificat, la chaîne, et si le nom d’hôte du back-end correspond au certificat.',
  'For an internal load balancer, confirm the client is on a network that can reach the private front-end IP.':
    'Pour un équilibreur de charge interne, vérifiez que le client se trouve sur un réseau capable d’atteindre l’IP frontale privée.',
  'For inbound: confirm the public IP, the NSG allow rule, and the health of the backend.':
    'Pour le trafic entrant : vérifiez l’IP publique, la règle d’autorisation NSG et l’intégrité du back-end.',
  'For outbound VNet integration, WEBSITE_DNS_SERVER and route-all settings decide whether traffic uses VNet DNS and routes.':
    'Pour l’intégration au VNet en sortie, les paramètres WEBSITE_DNS_SERVER et route-all déterminent si le trafic utilise le DNS et les itinéraires du VNet.',
  'For outbound: confirm an explicit method exists — a NAT Gateway, a load balancer outbound rule, or a public IP on the NIC. Default outbound access was retired on 30 September 2025, so a new VM without one of these has no internet access at all.': 'Pour le trafic sortant : vérifiez qu’une méthode explicite existe — une NAT Gateway, une règle de sortie d’équilibreur de charge ou une IP publique sur la carte réseau. L’accès sortant par défaut a été retiré le 30 septembre 2025, une nouvelle machine virtuelle sans l’un de ces éléments n’a donc aucun accès à Internet.',
  'Front Door is a global Layer-7 entry point with content delivery and WAF built in.':
    'Front Door est un point d’entrée mondial de couche 7 intégrant la diffusion de contenu et un WAF.',
  'Gateway, Firewall, and Bastion subnets must use their exact reserved names or deployment fails.':
    'Les sous-réseaux de passerelle, de pare-feu et Bastion doivent porter exactement leurs noms réservés, faute de quoi le déploiement échoue.',
  'Hybrid flows depend on it, and it is frequently the piece nobody has console access to during a call.':
    'Les flux hybrides en dépendent, et c’est souvent l’élément à la console duquel personne n’a accès pendant un appel.',
  'IKE phase 1/2 settings, PSK, and the IPsec policy must match EXACTLY on both ends.':
    'Les paramètres des phases 1 et 2 d’IKE, la clé prépartagée et la stratégie IPsec doivent correspondre EXACTEMENT aux deux extrémités.',
  'IP forwarding must be enabled on the NVA NIC in Azure AND inside the guest OS.':
    'Le transfert IP doit être activé sur la carte réseau du NVA dans Azure ET dans le système d’exploitation invité.',
  'If the account firewall is set to selected networks, confirm the caller subnet or IP is listed.':
    'Si le pare-feu du compte est configuré sur des réseaux sélectionnés, vérifiez que le sous-réseau ou l’IP de l’appelant y figure.',
  'If the firewall is restricted, confirm the caller network or the trusted-services exception is allowed.':
    'Si le pare-feu est restreint, vérifiez que le réseau de l’appelant ou l’exception pour les services approuvés est autorisé.',
  'Inbound and outbound are configured independently — confirm which direction is failing.':
    'L’entrée et la sortie se configurent indépendamment : déterminez quel sens est en échec.',
  'Inbound and outbound endpoints each need their own delegated subnet.':
    'Les points de terminaison entrant et sortant nécessitent chacun leur propre sous-réseau délégué.',
  'Inbound internet traffic lands on a public IP attached to a gateway, load balancer, or VM. Outbound traffic leaves through a NAT Gateway, a load balancer, or a firewall.':
    'Le trafic entrant depuis Internet arrive sur une IP publique attachée à une passerelle, un équilibreur de charge ou une machine virtuelle. Le trafic sortant part via une passerelle NAT, un équilibreur de charge ou un pare-feu.',
  'Inbound private access uses a Private Endpoint. Outbound access into a VNet uses regional VNet integration — the two are separate features.':
    'L’accès privé entrant utilise un point de terminaison privé. L’accès sortant vers un VNet utilise l’intégration régionale au VNet : ce sont deux fonctionnalités distinctes.',
  'Individual public IPs are then allocated from the prefix and assigned to resources such as a NAT Gateway or load balancer.':
    'Des IP publiques individuelles sont ensuite allouées à partir du préfixe et affectées à des ressources telles qu’une passerelle NAT ou un équilibreur de charge.',
  'Instances share one network configuration and normally sit in a load balancer or Application Gateway backend pool.':
    'Les instances partagent une même configuration réseau et se trouvent normalement dans le pool principal d’un équilibreur de charge ou d’une Application Gateway.',
  'It answers "is this being blocked, and by what?" with data instead of guesswork.':
    'Il répond par des données, et non par des suppositions, à la question « est-ce bloqué, et par quoi ? ».',
  'It attaches to Application Gateway or Front Door and runs in Detection mode (log only) or Prevention mode (block).':
    'Elle s’attache à Application Gateway ou à Front Door et s’exécute en mode Détection (journalisation seule) ou en mode Prévention (blocage).',
  'It attaches to a subnet, a NIC, or both. Rules are evaluated by priority, lowest number first, and the first match wins. Because it is stateful, return traffic for an allowed flow is permitted automatically.':
    'Il s’attache à un sous-réseau, à une carte réseau ou aux deux. Les règles sont évaluées par priorité, du numéro le plus bas au plus élevé, et la première correspondance l’emporte. Comme il est avec état, le trafic de retour d’un flux autorisé est admis automatiquement.',
  'It attaches to a subnet. Azure picks the most specific matching prefix; if two routes tie, a UDR beats a BGP route, which beats a system route.':
    'Elle s’attache à un sous-réseau. Azure retient le préfixe correspondant le plus spécifique ; à égalité, une UDR l’emporte sur un itinéraire BGP, qui l’emporte sur un itinéraire système.',
  'It attaches to one or more subnets. Once attached, it takes priority over all other outbound methods for those subnets. It never allows unsolicited inbound traffic.':
    'Elle s’attache à un ou plusieurs sous-réseaux. Une fois attachée, elle est prioritaire sur toutes les autres méthodes de sortie de ces sous-réseaux. Elle n’autorise jamais de trafic entrant non sollicité.',
  'It avoids the public internet entirely, giving predictable latency, higher bandwidth, and an SLA.':
    'Il évite totalement Internet public, offrant une latence prévisible, une bande passante supérieure et un SLA.',
  'It blocks application-layer attacks that a Layer-4 firewall or NSG cannot see, because those only look at IP and port.':
    'Elle bloque les attaques de couche applicative qu’un pare-feu de couche 4 ou un NSG ne peuvent pas voir, car ceux-ci n’examinent que l’IP et le port.',
  'It can be deployed into a VNet subnet for private access, or given a public IP for direct access.':
    'Il peut être déployé dans un sous-réseau de VNet pour un accès privé, ou recevoir une IP publique pour un accès direct.',
  'It can be external (public front end) or internal (VNet-only). In VNet mode it has strict required NSG rules and dependency endpoints.':
    'Il peut être externe (frontal public) ou interne (VNet uniquement). En mode VNet, il impose des règles NSG obligatoires strictes et des points de terminaison de dépendance.',
  'It can be reached publicly, or privately through a Private Endpoint with the matching Private DNS Zone.':
    'On peut l’atteindre publiquement, ou de façon privée via un point de terminaison privé avec la zone DNS privée correspondante.',
  'It cannot be used for inbound; if inbound is needed, that is a separate load balancer or public IP.':
    'Elle ne peut pas servir au trafic entrant ; si l’entrée est nécessaire, il faut un équilibreur de charge ou une IP publique distincts.',
  'It carries the shared key, the IPsec/IKE policy, and the BGP setting for that specific link.':
    'Elle porte la clé partagée, la stratégie IPsec/IKE et le paramétrage BGP de cette liaison précise.',
  'It centralises egress control and logging, so one policy governs what an entire hub-and-spoke estate is allowed to reach.':
    'Il centralise le contrôle et la journalisation de la sortie, si bien qu’une seule stratégie régit ce que tout un environnement en étoile est autorisé à atteindre.',
  'It clarifies who experiences the behaviour being described.':
    'Cela précise qui subit le comportement décrit.',
  'It connects from the office LAN, from home, or through a VPN client, and each path resolves DNS differently.':
    'Il se connecte depuis le réseau local du bureau, depuis le domicile ou via un client VPN, et chaque chemin résout le DNS différemment.',
  'It connects over the public internet unless a VPN profile is applied.':
    'Il se connecte via Internet public, sauf si un profil VPN est appliqué.',
  'It connects to Azure through a Site-to-Site VPN tunnel or an ExpressRoute circuit. Routes are exchanged either statically or via BGP.':
    'Il se connecte à Azure via un tunnel VPN de site à site ou un circuit ExpressRoute. Les itinéraires sont échangés de manière statique ou via BGP.',
  'It connects to a subnet through a NIC. Its reachability is governed by the NSG on that NIC and on the subnet, plus the guest OS firewall.':
    'Elle se connecte à un sous-réseau via une carte réseau. Son accessibilité est régie par le NSG de cette carte et du sous-réseau, ainsi que par le pare-feu du système d’exploitation invité.',
  'It gives container workloads scheduling, self-healing, and scaling without you operating Kubernetes masters.':
    'Il offre aux charges de travail conteneurisées la planification, l’auto-réparation et la mise à l’échelle sans que vous exploitiez de maîtres Kubernetes.',
  'It gives one consistent front door for many backends, with authentication, rate limiting, and transformation applied by policy.':
    'Elle offre une porte d’entrée unique et cohérente pour de nombreux back-ends, avec authentification, limitation de débit et transformation appliquées par stratégie.',
  'It gives you a predictable, unchanging range so partners and firewalls can allow-list your egress addresses once.':
    'Il vous fournit une plage prévisible et immuable afin que partenaires et pare-feu inscrivent vos adresses de sortie sur liste verte une seule fois.',
  'It gives you a stable, known egress address and a very large pool of SNAT ports, which prevents the port-exhaustion failures common with default outbound access.':
    'Elle vous fournit une adresse de sortie stable et connue ainsi qu’un très large pool de ports SNAT, ce qui évite les pannes par épuisement de ports fréquentes avec l’accès sortant par défaut.',
  'It gives you private connectivity into the VNet over the public internet, without exposing resources publicly.':
    'Elle vous offre une connectivité privée vers le VNet via Internet public, sans exposer publiquement les ressources.',
  'It gives your resources private IP addresses and a security boundary, so they can talk to each other privately instead of over the public internet.':
    'Il donne à vos ressources des adresses IP privées et une limite de sécurité, afin qu’elles communiquent entre elles de façon privée plutôt que par Internet public.',
  'It groups resources with a shared lifecycle so they can be deployed, permissioned, and deleted together.':
    'Il regroupe des ressources ayant un cycle de vie commun afin qu’elles puissent être déployées, autorisées et supprimées ensemble.',
  'It handles scale and instance repair for you, so capacity follows demand without manual VM creation.':
    'Il gère à votre place la mise à l’échelle et la réparation des instances, si bien que la capacité suit la demande sans création manuelle de machines virtuelles.',
  'It injects the routes learned from on-premises into the VNet and forwards traffic onto the private circuit.':
    'Elle injecte dans le VNet les itinéraires appris du site local et achemine le trafic vers le circuit privé.',
  'It is deployed into a dedicated AzureBastionSubnet. The admin connects to the Azure portal over TLS, and Bastion opens the RDP or SSH session to the VM private IP.':
    'Il est déployé dans un sous-réseau AzureBastionSubnet dédié. L’administrateur se connecte au portail Azure via TLS, et Bastion ouvre la session RDP ou SSH vers l’IP privée de la machine virtuelle.',
  'It is enabled per region. IP flow verify names the exact NSG rule that allowed or denied a flow; next hop shows where a packet would actually be routed.':
    'Il s’active par région. La vérification de flux IP indique la règle NSG exacte qui a autorisé ou refusé un flux ; le saut suivant montre où un paquet serait réellement routé.',
  'It is reached over HTTPS. It can be locked down with firewall rules or a Private Endpoint, and callers usually authenticate with a managed identity.':
    'On y accède via HTTPS. On peut le verrouiller avec des règles de pare-feu ou un point de terminaison privé, et les appelants s’authentifient généralement avec une identité managée.',
  'It is reached over TCP 1433. The connection policy is Redirect (which also needs ports 11000-11999) or Proxy (1433 only).':
    'On y accède via TCP 1433. La stratégie de connexion est Redirect (qui nécessite aussi les ports 11000-11999) ou Proxy (1433 uniquement).',
  'It is referenced by a Connection resource, which pairs it with the Azure VPN Gateway. With BGP, the prefix list is learned dynamically instead.':
    'Elle est référencée par une ressource de connexion qui l’associe à la passerelle VPN Azure. Avec BGP, la liste des préfixes est apprise dynamiquement à la place.',
  'It is the basic segmentation control in Azure, but it does not deny by default: the built-in AllowVNetInBound rule already permits all traffic inside the virtual network, so segmentation starts only when you add your own higher-priority deny.': 'C’est le contrôle de segmentation de base dans Azure, mais il ne refuse pas par défaut : la règle intégrée AllowVNetInBound autorise déjà tout le trafic à l’intérieur du réseau virtuel, la segmentation ne commence donc que lorsque vous ajoutez votre propre règle de refus plus prioritaire.',
  'It is the control plane. Control-plane and data-plane failures look similar to users but have different causes.':
    'Il s’agit du plan de contrôle. Pour les utilisateurs, les pannes du plan de contrôle et du plan de données se ressemblent, mais leurs causes diffèrent.',
  'It is the destination doing the actual work — serving the page, running the query, hosting the application.':
    'C’est la destination qui effectue le travail réel : servir la page, exécuter la requête, héberger l’application.',
  'It is the general-purpose durable store that most workloads read from and write to.':
    'C’est le stockage durable polyvalent depuis lequel la plupart des charges de travail lisent et dans lequel elles écrivent.',
  'It is the most common place a reported issue is actually observed.':
    'C’est l’endroit où un problème signalé est le plus souvent réellement observé.',
  'It is what makes a resource reachable from the internet, and it identifies your traffic when it leaves Azure.':
    'C’est ce qui rend une ressource accessible depuis Internet, et ce qui identifie votre trafic lorsqu’il quitte Azure.',
  'It is where a VM gets its IP configuration, and it is the most precise place to attach an NSG or check what rules and routes actually apply.':
    'C’est là qu’une machine virtuelle obtient sa configuration IP, et c’est l’endroit le plus précis pour attacher un NSG ou vérifier quelles règles et quels itinéraires s’appliquent réellement.',
  'It keeps credentials out of code and configuration, and gives you an audit trail of who read what.':
    'Il maintient les informations d’identification hors du code et de la configuration, et fournit une piste d’audit indiquant qui a lu quoi.',
  'It keeps firewall rules readable and lets you update one object instead of editing many rules.':
    'Il garde les règles de pare-feu lisibles et vous permet de mettre à jour un seul objet au lieu de modifier de nombreuses règles.',
  'It keeps rules meaningful as the environment scales — "web can reach app" survives every IP change.':
    'Il maintient le sens des règles à mesure que l’environnement grandit : « web peut atteindre app » survit à tout changement d’IP.',
  'It lets AKS workloads use Gateway API and Ingress objects to publish services without hand-managing gateway configuration.':
    'Il permet aux charges de travail AKS d’utiliser l’API Gateway et les objets Ingress pour publier des services sans gérer manuellement la configuration de la passerelle.',
  'It lets you offer a service to customers or other business units without peering networks or exposing anything publicly.':
    'Il vous permet de proposer un service à des clients ou à d’autres entités sans appairer de réseaux ni exposer quoi que ce soit publiquement.',
  'It lets you reach a PaaS service such as Storage or SQL over a private IP on the Microsoft backbone, so the public endpoint can be disabled entirely.':
    'Il vous permet d’atteindre un service PaaS tel que Storage ou SQL via une IP privée sur le réseau principal Microsoft, si bien que le point de terminaison public peut être totalement désactivé.',
  'It lets you write rules once and inherit them across firewalls, with a parent policy for organisation-wide rules and child policies per environment.':
    'Elle vous permet d’écrire les règles une seule fois et de les hériter sur plusieurs pare-feu, avec une stratégie parente pour les règles à l’échelle de l’organisation et des stratégies enfants par environnement.',
  'It lives in the reserved GatewaySubnet and pairs with a Local Network Gateway (the remote device) through a Connection resource. Routes are static or learned via BGP.':
    'Elle réside dans le sous-réseau réservé GatewaySubnet et s’associe à une passerelle de réseau local (l’équipement distant) via une ressource de connexion. Les itinéraires sont statiques ou appris via BGP.',
  'It marks where the user-visible experience begins, which is the perspective the customer is reporting from.':
    'Cela marque le début de l’expérience visible par l’utilisateur, c’est-à-dire le point de vue depuis lequel le client rapporte le problème.',
  'It never sees your traffic. It only returns a CNAME or IP in a DNS answer, so the client connects directly to the chosen endpoint afterwards.':
    'Il ne voit jamais votre trafic. Il renvoie seulement un CNAME ou une IP dans une réponse DNS ; le client se connecte ensuite directement au point de terminaison choisi.',
  'It only works if DNS resolves the service hostname to the private IP. That is normally done with a Private DNS Zone linked to the VNet.':
    'Cela ne fonctionne que si le DNS résout le nom d’hôte du service vers l’IP privée. On y parvient normalement avec une zone DNS privée liée au VNet.',
  'It provides a SQL Server-compatible database without you patching, backing up, or clustering servers.':
    'Il fournit une base de données compatible SQL Server sans que vous ayez à appliquer des correctifs, à sauvegarder ou à mettre des serveurs en cluster.',
  'It provides high availability and scale — if one backend instance fails its health probe, new connections stop going to it.':
    'Il apporte haute disponibilité et mise à l’échelle : si une instance principale échoue à sa sonde d’intégrité, les nouvelles connexions cessent de lui être envoyées.',
  'It provides transit routing between everything attached to it, without you having to build gateway chaining or route tables by hand.':
    'Il assure le routage de transit entre tout ce qui y est rattaché, sans que vous ayez à construire manuellement des chaînages de passerelles ou des tables de routage.',
  'It reaches Azure APIs over HTTPS, or reaches workloads directly over SSH, RDP, or an application port.':
    'Il atteint les API Azure via HTTPS, ou atteint directement les charges de travail via SSH, RDP ou un port applicatif.',
  'It reaches Azure across a VPN tunnel or ExpressRoute circuit, or over the public internet.':
    'Il atteint Azure via un tunnel VPN, un circuit ExpressRoute ou Internet public.',
  'It removes OS patching and scaling work, so teams ship application code instead of infrastructure.':
    'Il supprime le travail de correctifs du système d’exploitation et de mise à l’échelle, si bien que les équipes livrent du code applicatif plutôt que de l’infrastructure.',
  'It removes the need to give VMs public IPs or open 3389/22 to the internet, which is one of the most exploited misconfigurations.':
    'Il supprime la nécessité d’attribuer des IP publiques aux machines virtuelles ou d’ouvrir les ports 3389/22 sur Internet, l’une des erreurs de configuration les plus exploitées.',
  'It removes the work of building and maintaining your own hubs, route tables, and gateway meshes across many regions and branches.':
    'Il supprime le travail de construction et de maintenance de vos propres hubs, tables de routage et maillages de passerelles à travers de nombreuses régions et succursales.',
  'It represents scripted or interactive commands, which are often where the reproduction steps live.':
    'Cela représente des commandes scriptées ou interactives, où se trouvent souvent les étapes de reproduction.',
  'It resolves the target name through DNS and then connects to the returned address.':
    'Il résout le nom cible via le DNS puis se connecte à l’adresse renvoyée.',
  'It routes by URL path and hostname, terminates TLS so certificates live in one place, and can run a Web Application Firewall in front of your app.':
    'Elle route selon le chemin d’URL et le nom d’hôte, termine TLS pour centraliser les certificats, et peut exécuter un pare-feu d’applications web devant votre application.',
  'It separates billing, applies quota limits, and acts as a scope for role assignments and policy.':
    'Il sépare la facturation, applique des limites de quota et sert d’étendue pour les attributions de rôles et les stratégies.',
  'It shares the App Service networking model — Private Endpoint for inbound, VNet integration for outbound. The hosting plan decides what is available: Flex Consumption and Premium both support VNet integration, the classic Consumption plan does not.': 'Il partage le modèle réseau d’App Service : Private Endpoint en entrée, intégration au VNet en sortie. Le plan d’hébergement détermine ce qui est disponible : Flex Consumption et Premium prennent tous deux en charge l’intégration au VNet, contrairement au plan Consumption classique.',
  'It sits in the GatewaySubnet and is linked to a circuit through a connection. Route exchange is always via BGP.':
    'Elle réside dans le GatewaySubnet et est liée à un circuit via une connexion. L’échange d’itinéraires se fait toujours via BGP.',
  'It steers users to the closest or highest-priority region and removes failed regions from DNS answers.':
    'Il oriente les utilisateurs vers la région la plus proche ou la plus prioritaire et retire des réponses DNS les régions défaillantes.',
  'It suits glue logic and triggers where running a full application host would be wasteful.':
    'Cela convient à la logique de liaison et aux déclencheurs, pour lesquels exécuter un hôte applicatif complet serait un gaspillage.',
  'It suits short-lived or bursty jobs where a full Kubernetes cluster would be overkill.':
    'Cela convient aux traitements courts ou en rafale, pour lesquels un cluster Kubernetes complet serait excessif.',
  'It suits workloads that need multi-region replication and predictable latency at scale.':
    'Cela convient aux charges de travail nécessitant une réplication multirégion et une latence prévisible à grande échelle.',
  'It terminates the user connection at the nearest Microsoft edge site, which cuts latency, and it fails over between regional backends automatically.':
    'Il termine la connexion de l’utilisateur sur le site de périphérie Microsoft le plus proche, ce qui réduit la latence, et bascule automatiquement entre les back-ends régionaux.',
  'Key Vault stores secrets, keys, and certificates with access controlled by policy or RBAC.':
    'Key Vault stocke des secrets, des clés et des certificats, avec un accès contrôlé par stratégie ou par RBAC.',
  'Make sure the return path has an equivalent route, or the flow becomes asymmetric and is dropped by the stateful firewall.':
    'Assurez-vous que le chemin de retour dispose d’un itinéraire équivalent, sans quoi le flux devient asymétrique et est rejeté par le pare-feu avec état.',
  'Management traffic often takes a completely different path from application traffic and has its own controls.':
    'Le trafic d’administration emprunte souvent un chemin totalement différent de celui du trafic applicatif et possède ses propres contrôles.',
  'Mobile clients frequently arrive over carrier networks or a Point-to-Site VPN, so their path differs from office clients.':
    'Les clients mobiles arrivent fréquemment via des réseaux d’opérateur ou un VPN point à site ; leur chemin diffère donc de celui des clients du bureau.',
  'Most enterprise workloads are hybrid, so Azure resources must reach systems that still live on-premises (and vice versa).':
    'La plupart des charges de travail d’entreprise sont hybrides ; les ressources Azure doivent donc atteindre des systèmes qui résident encore en local (et inversement).',
  'NAT Gateway is zonal — confirm the zone matches the workload for zone-resilient designs.':
    'La passerelle NAT est zonale : pour les conceptions résilientes aux zones, vérifiez que la zone correspond à celle de la charge de travail.',
  'NAT Gateway provides outbound-only internet connectivity for a subnet, using dedicated public IPs.':
    'La passerelle NAT fournit une connectivité Internet uniquement sortante pour un sous-réseau, à l’aide d’IP publiques dédiées.',
  'NSGs and UDRs affect a Private Endpoint only when the subnet has PrivateEndpointNetworkPolicies enabled — it is disabled by default, so a rule you expect to match may never be evaluated at all.': 'Les NSG et les UDR n’affectent un Private Endpoint que si le sous-réseau a PrivateEndpointNetworkPolicies activé — il est désactivé par défaut, donc une règle que vous pensez voir correspondre peut ne jamais être évaluée.',
  'Native client and IP-based connection require the Standard or Premium SKU.':
    'Le client natif et la connexion basée sur l’IP nécessitent la référence Standard ou Premium.',
  'Network Watcher is the diagnostics toolbox for Azure networking — connection troubleshoot, IP flow verify, next hop, packet capture, and flow logs.':
    'Network Watcher est la boîte à outils de diagnostic du réseau Azure : dépannage de connexion, vérification de flux IP, saut suivant, capture de paquets et journaux de flux.',
  'Azure CNI is the current plugin and the IP mode is what matters. In node-subnet or pod-subnet mode every pod gets a real VNet IP, so pod addresses must be planned into the subnet size; CNI Overlay instead puts pods on a separate overlay range and consumes far fewer VNet IPs. Legacy kubenet is retiring on 31 March 2028.': 'Azure CNI est le plug-in actuel et c’est le mode d’adressage IP qui compte. En mode node-subnet ou pod-subnet, chaque pod reçoit une véritable IP du VNet : les adresses des pods doivent donc être prévues dans la taille du sous-réseau. CNI Overlay place au contraire les pods sur une plage de superposition distincte et consomme beaucoup moins d’IP du VNet. L’ancien kubenet est retiré le 31 mars 2028.',
  'Nothing reaches the right destination if the name resolves to the wrong address — DNS is the first hop of almost every flow.':
    'Rien n’atteint la bonne destination si le nom se résout vers la mauvaise adresse : le DNS est le premier saut de presque tous les flux.',
  'On-premises clients cannot query Azure Private DNS Zones directly, and Azure clients often need to resolve on-premises names. The resolver bridges both directions.':
    'Les clients locaux ne peuvent pas interroger directement les zones DNS privées Azure, et les clients Azure ont souvent besoin de résoudre des noms locaux. Le résolveur fait le pont dans les deux sens.',
  'One VM can have multiple NICs, and each NIC can hold multiple IP configurations. Accelerated Networking is enabled per NIC.':
    'Une machine virtuelle peut avoir plusieurs cartes réseau, et chaque carte peut porter plusieurs configurations IP. La mise en réseau accélérée s’active par carte réseau.',
  'Outbound type (load balancer, NAT Gateway, or userDefinedRouting) determines the egress path.':
    'Le type de sortie (équilibreur de charge, passerelle NAT ou userDefinedRouting) détermine le chemin de sortie.',
  'Over Private Link, confirm the privatelink.vaultcore.azure.net zone is linked to the VNet.':
    'Via Private Link, vérifiez que la zone privatelink.vaultcore.azure.net est liée au VNet.',
  'Over Private Link, verify the name resolves to the private IP.':
    'Via Private Link, vérifiez que le nom se résout vers l’IP privée.',
  'Portal actions call Azure Resource Manager over HTTPS; they do not traverse your VNet.':
    'Les actions du portail appellent Azure Resource Manager via HTTPS ; elles ne traversent pas votre VNet.',
  'Private Endpoint requires a DNS record for every region the account is replicated to.':
    'Le point de terminaison privé nécessite un enregistrement DNS pour chaque région vers laquelle le compte est répliqué.',
  'Private Link Service publishes your own service, sitting behind a Standard internal load balancer, so other VNets can consume it via a Private Endpoint.':
    'Private Link Service publie votre propre service, placé derrière un équilibreur de charge interne Standard, afin que d’autres VNets puissent le consommer via un point de terminaison privé.',
  'Public-facing workloads must be reachable from the internet, and most workloads need outbound internet access for updates and API calls.':
    'Les charges de travail exposées au public doivent être accessibles depuis Internet, et la plupart ont besoin d’un accès Internet sortant pour les mises à jour et les appels d’API.',
  'Real environments contain third-party appliances, SaaS endpoints, and legacy systems that still shape the traffic path.':
    'Les environnements réels comportent des appliances tierces, des points de terminaison SaaS et des systèmes hérités qui continuent de façonner le chemin du trafic.',
  'Redirect policy requires 11000-11999 outbound to be open — this is a very common firewall oversight.':
    'La stratégie Redirect impose que les ports sortants 11000-11999 soient ouverts : c’est un oubli très fréquent sur les pare-feu.',
  'Region choice controls latency to your users, data-residency compliance, and which services and SKUs are even available.':
    'Le choix de la région conditionne la latence vers vos utilisateurs, la conformité en matière de résidence des données et même les services et références disponibles.',
  'Remember inbound is evaluated subnet-first then NIC; outbound is NIC-first then subnet.':
    'Rappelez-vous que l’entrée est évaluée d’abord au niveau du sous-réseau puis de la carte réseau ; la sortie, d’abord la carte réseau puis le sous-réseau.',
  'Resource group membership never blocks traffic — if something is unreachable, look at NSG, UDR, DNS, or peering instead.':
    'L’appartenance à un groupe de ressources ne bloque jamais le trafic : si quelque chose est inaccessible, regardez plutôt le NSG, l’UDR, le DNS ou le peering.',
  'Resources are placed in subnets inside the VNet. Everything in the same VNet can reach everything else by default; reaching another VNet requires peering, a gateway, or Private Link.':
    'Les ressources sont placées dans des sous-réseaux à l’intérieur du VNet. Par défaut, tout ce qui se trouve dans le même VNet peut atteindre tout le reste ; atteindre un autre VNet nécessite un peering, une passerelle ou Private Link.',
  'Resources in different subscriptions can still be peered and connected, but quota, policy, and RBAC are evaluated per subscription.':
    'Des ressources situées dans des abonnements différents peuvent tout de même être appairées et connectées, mais le quota, les stratégies et RBAC sont évalués par abonnement.',
  'Rule collection groups are evaluated by priority, and inherited parent rules always run before child rules.':
    'Les groupes de collections de règles sont évalués par priorité, et les règles héritées de la stratégie parente s’exécutent toujours avant les règles enfants.',
  'Run IP flow verify for the failing 5-tuple — it names the deciding rule directly.':
    'Exécutez la vérification de flux IP pour le quintuplet en échec : elle désigne directement la règle déterminante.',
  'Run next hop from the source NIC to confirm the routing decision.':
    'Exécutez le saut suivant depuis la carte réseau source pour confirmer la décision de routage.',
  'Secured hub (Routing Intent) changes the path — confirm whether traffic is being sent to Azure Firewall.':
    'Le hub sécurisé (intention de routage) modifie le chemin : vérifiez si le trafic est envoyé vers Azure Firewall.',
  'Service tags change over time; prefer them over hard-coded IP ranges.':
    'Les balises de service évoluent avec le temps ; privilégiez-les par rapport à des plages d’IP codées en dur.',
  'Standard SKU addresses are static and secure-by-default — inbound is denied unless an NSG allows it. Basic SKU is retired.':
    'Les adresses de la référence Standard sont statiques et sécurisées par défaut : l’entrée est refusée sauf si un NSG l’autorise. La référence De base est retirée.',
  'Subnets let you segment a VNet so different tiers (web, app, data) can be secured and routed independently.':
    'Les sous-réseaux vous permettent de segmenter un VNet afin que les différents niveaux (web, application, données) soient sécurisés et routés indépendamment.',
  'Test on and off the corporate network — a split-tunnel VPN policy often explains "works for some users".':
    'Testez sur le réseau d’entreprise et en dehors : une stratégie VPN en tunnel fractionné explique souvent le « cela fonctionne pour certains utilisateurs ».',
  'The ALB controller in the cluster watches Kubernetes objects and programs the gateway, forwarding HTTP/HTTPS traffic straight to pod endpoints.':
    'Le contrôleur ALB du cluster observe les objets Kubernetes et programme la passerelle, en transmettant le trafic HTTP/HTTPS directement aux points de terminaison des pods.',
  'The Azure portal — the browser-based management plane at portal.azure.com.':
    'Le portail Azure : le plan de gestion accessible depuis un navigateur à l’adresse portal.azure.com.',
  'The NAT subnet must have enough free IP addresses for the number of connections.':
    'Le sous-réseau NAT doit disposer d’assez d’adresses IP libres pour le nombre de connexions.',
  'The SDK can use direct mode, which opens additional TCP ports beyond 443, or gateway mode which uses 443 only.':
    'Le SDK peut utiliser le mode direct, qui ouvre des ports TCP supplémentaires au-delà du 443, ou le mode passerelle, qui n’utilise que le 443.',
  'The backend must be behind a Standard SKU internal load balancer — Basic is not supported.':
    'Le back-end doit se trouver derrière un équilibreur de charge interne de référence Standard ; la référence De base n’est pas prise en charge.',
  'The circuit carries one or more peerings. Private peering reaches your VNets; Microsoft peering reaches Microsoft public services such as Microsoft 365.':
    'Le circuit transporte un ou plusieurs peerings. Le peering privé atteint vos VNets ; le peering Microsoft atteint les services publics Microsoft tels que Microsoft 365.',
  'The client resolves a name through DNS, then connects to whatever public or private IP that name returns.':
    'Le client résout un nom via le DNS, puis se connecte à l’IP publique ou privée renvoyée par ce nom.',
  'The end user or client device that starts the request.':
    'L’utilisateur final ou l’appareil client qui déclenche la requête.',
  'The function needs reachable storage; a blocked storage account stops the function starting at all.':
    'La fonction a besoin d’un stockage accessible ; un compte de stockage bloqué empêche totalement son démarrage.',
  'The gateway alone does nothing; the connection is what actually establishes and holds the tunnel or circuit link.':
    'La passerelle seule ne fait rien ; c’est la connexion qui établit et maintient réellement le tunnel ou la liaison du circuit.',
  'The guest OS firewall is a separate layer from the NSG — Windows Firewall or iptables can block traffic the NSG allowed.':
    'Le pare-feu du système d’exploitation invité est une couche distincte du NSG : le Pare-feu Windows ou iptables peuvent bloquer un trafic que le NSG a autorisé.',
  'The plan is associated with a VNet, and every public IP in that VNet is then protected.':
    'Le plan est associé à un VNet, et toutes les IP publiques de ce VNet sont alors protégées.',
  'The public internet — traffic arriving from, or leaving to, addresses outside your network.':
    'Internet public : le trafic provenant d’adresses extérieures à votre réseau ou partant vers celles-ci.',
  'The subnet must be named exactly AzureBastionSubnet and be /26 or larger.':
    'Le sous-réseau doit s’appeler exactement AzureBastionSubnet et être en /26 ou plus grand.',
  'The target VM NSG must allow inbound 3389/22 FROM the Bastion subnet.':
    'Le NSG de la machine virtuelle cible doit autoriser l’entrée sur 3389/22 DEPUIS le sous-réseau Bastion.',
  'The user resolves your hostname to the closest edge POP. The edge applies WAF and caching rules, then forwards over the Microsoft backbone to the healthiest origin.':
    'L’utilisateur résout votre nom d’hôte vers le point de présence de périphérie le plus proche. La périphérie applique les règles WAF et de mise en cache, puis transmet via le réseau principal Microsoft à l’origine la plus saine.',
  'This represents the customer network outside Azure — a corporate datacenter, branch office, or another cloud.':
    'Cela représente le réseau du client en dehors d’Azure : un centre de données d’entreprise, une succursale ou un autre cloud.',
  'Traffic Manager is DNS-based global load balancing — it answers DNS queries with the endpoint you should use.':
    'Traffic Manager assure un équilibrage de charge mondial fondé sur le DNS : il répond aux requêtes DNS par le point de terminaison que vous devez utiliser.',
  'Traffic is steered to it with a UDR. For high availability it sits behind an internal load balancer, and its NIC must have IP forwarding enabled.':
    'Le trafic y est dirigé par une UDR. Pour la haute disponibilité, il se place derrière un équilibreur de charge interne, et le transfert IP doit être activé sur sa carte réseau.',
  'Traffic is steered to it with a User-Defined Route pointing at its private IP. Rules are evaluated in order: DNAT, then network rules, then application rules.':
    'Le trafic y est dirigé par un itinéraire défini par l’utilisateur pointant vers son IP privée. Les règles sont évaluées dans l’ordre : DNAT, puis règles réseau, puis règles applicatives.',
  'Treat it like any other hop: confirm what it listens on, what it forwards to, and who controls its rules.':
    'Traitez-le comme n’importe quel autre saut : vérifiez sur quoi il écoute, vers quoi il transmet et qui contrôle ses règles.',
  'Use Effective security rules on the NIC — that shows the merged subnet + NIC result, which is what actually applies.':
    'Utilisez les règles de sécurité effectives sur la carte réseau : elles montrent le résultat fusionné du sous-réseau et de la carte, c’est-à-dire ce qui s’applique réellement.',
  'Use effective routes on a workload NIC to prove the on-premises prefixes really arrived.':
    'Utilisez les itinéraires effectifs sur une carte réseau de charge de travail pour prouver que les préfixes locaux sont réellement arrivés.',
  'Used as a generic actor when the exact device does not matter.':
    'Utilisé comme acteur générique lorsque l’appareil exact n’a pas d’importance.',
  'VNet connections, VPN sites, and ExpressRoute circuits attach to the hub, and hub route tables control who can reach whom.':
    'Les connexions de VNet, les sites VPN et les circuits ExpressRoute se rattachent au hub, et les tables de routage du hub contrôlent qui peut atteindre qui.',
  'VNet-deployed container groups need a delegated subnet.':
    'Les groupes de conteneurs déployés dans un VNet nécessitent un sous-réseau délégué.',
  'VNet-injected APIM requires specific inbound NSG rules; missing them makes the service unhealthy.':
    'APIM injecté dans un VNet exige des règles NSG entrantes précises ; leur absence rend le service non sain.',
  'Verify the SKU supports the tunnel count and throughput you need.':
    'Vérifiez que la référence prend en charge le nombre de tunnels et le débit dont vous avez besoin.',
  'Verify the VNet address space does not overlap with any peered VNet or the on-premises network.':
    'Vérifiez que l’espace d’adressage du VNet ne chevauche celui d’aucun VNet appairé ni celui du réseau local.',
  'Verify the downstream party has allow-listed the whole prefix, not one address from it.':
    'Vérifiez que la partie destinataire a inscrit sur liste verte le préfixe entier, et non une seule adresse de celui-ci.',
  'Verify the target on-premises DNS server actually answers queries from the Azure source range.':
    'Vérifiez que le serveur DNS local cible répond réellement aux requêtes provenant de la plage source Azure.',
  'Verify you have not hit a subscription-level quota (public IPs, VNet peerings, gateway count).':
    'Vérifiez que vous n’avez pas atteint un quota au niveau de l’abonnement (IP publiques, peerings de VNet, nombre de passerelles).',
  'Virtual WAN is a managed networking service that provides a global transit hub-and-spoke backbone.':
    'Virtual WAN est un service réseau managé qui fournit un réseau principal mondial de transit en étoile.',
  'Watch for overlapping address space between on-premises and the Azure VNet — that breaks routing.':
    'Surveillez tout chevauchement d’espace d’adressage entre le site local et le VNet Azure : cela casse le routage.',
  'You assign NICs to the ASG, then reference the ASG as the source or destination in NSG rules.':
    'Vous affectez des cartes réseau à l’ASG, puis vous référencez l’ASG comme source ou destination dans les règles NSG.',
  'You create hubs per region and connect VNets, branches (VPN), and ExpressRoute circuits to them. Microsoft handles the any-to-any routing between hubs.':
    'Vous créez des hubs par région et y connectez des VNets, des succursales (VPN) et des circuits ExpressRoute. Microsoft gère le routage de tous vers tous entre les hubs.',
  'You need it whenever traffic must take a path Azure would not choose on its own — for example forcing all egress through a firewall or NVA.':
    'Vous en avez besoin chaque fois que le trafic doit emprunter un chemin qu’Azure ne choisirait pas de lui-même, par exemple pour forcer toute la sortie à passer par un pare-feu ou un NVA.',
  'Zone-redundant vs zonal matters for availability during a zone outage.':
    'La distinction entre redondant interzone et zonal est importante pour la disponibilité lors d’une panne de zone.',
};

const de: Dict = {
  'A 0.0.0.0/0 route with next hop None or a stale appliance IP blackholes all outbound traffic.':
    'Eine 0.0.0.0/0-Route mit dem nächsten Hop „None“ oder einer veralteten Appliance-IP verwirft den gesamten ausgehenden Verkehr spurlos.',
  'A 403 is authorisation (RBAC or access policy); a connection timeout is network.':
    'Ein 403 ist ein Autorisierungsproblem (RBAC oder Zugriffsrichtlinie); ein Verbindungstimeout ist ein Netzwerkproblem.',
  'A 403 usually means authorisation or firewall; a name-resolution failure means DNS.':
    'Ein 403 bedeutet meist Autorisierung oder Firewall; ein Fehler bei der Namensauflösung bedeutet DNS.',
  'A Connection is the resource that pairs an Azure gateway with the remote side — a Local Network Gateway, another VNet gateway, or an ExpressRoute circuit.':
    'Eine Verbindung ist die Ressource, die ein Azure-Gateway mit der Gegenstelle koppelt — einem lokalen Netzwerkgateway, einem anderen VNet-Gateway oder einer ExpressRoute-Leitung.',
  'A DDoS Protection plan adds always-on traffic monitoring and adaptive mitigation for public IPs in protected VNets.':
    'Ein DDoS-Schutzplan ergänzt dauerhafte Verkehrsüberwachung und adaptive Abwehr für öffentliche IPs in geschützten VNets.',
  'A DNS zone holds the records that translate names into IP addresses. A Private DNS Zone is only visible to VNets that are linked to it.':
    'Eine DNS-Zone enthält die Einträge, die Namen in IP-Adressen übersetzen. Eine private DNS-Zone ist nur für die mit ihr verknüpften VNets sichtbar.',
  'A Function App runs small pieces of event-driven code, billed by execution.':
    'Eine Function App führt kleine, ereignisgesteuerte Codeteile aus und wird pro Ausführung abgerechnet.',
  'A Local Network Gateway is the Azure object that describes your on-premises VPN device — its public IP and the prefixes behind it.':
    'Ein lokales Netzwerkgateway ist das Azure-Objekt, das Ihr lokales VPN-Gerät beschreibt — dessen öffentliche IP und die dahinterliegenden Präfixe.',
  'A NIC is the virtual network adapter that attaches a VM to a subnet and holds its private IP.':
    'Eine NIC ist der virtuelle Netzwerkadapter, der eine VM mit einem Subnetz verbindet und deren private IP hält.',
  'A Private DNS Zone is linked to one or more VNets. With auto-registration enabled, VMs in a linked VNet register their own records.':
    'Eine private DNS-Zone wird mit einem oder mehreren VNets verknüpft. Bei aktivierter automatischer Registrierung tragen VMs in einem verknüpften VNet ihre eigenen Einträge ein.',
  'A Private Endpoint is a NIC in your subnet that holds a private IP mapped to a specific PaaS resource.':
    'Ein privater Endpunkt ist eine NIC in Ihrem Subnetz, die eine private IP hält, die einer bestimmten PaaS-Ressource zugeordnet ist.',
  'A Public IP Prefix is a contiguous block of public addresses reserved for your subscription.':
    'Ein öffentliches IP-Präfix ist ein zusammenhängender Block öffentlicher Adressen, der für Ihr Abonnement reserviert ist.',
  'A Public IP is an internet-routable address assigned to a gateway, load balancer, firewall, or VM NIC.':
    'Eine öffentliche IP ist eine im Internet routbare Adresse, die einem Gateway, Load Balancer, einer Firewall oder einer VM-NIC zugewiesen wird.',
  'A Scale Set manages an identical group of VMs that grows and shrinks automatically.':
    'Eine Skalierungsgruppe verwaltet eine identische Gruppe von VMs, die automatisch wächst und schrumpft.',
  'A Storage Account holds blobs, files, queues, and tables behind a public hostname per service.':
    'Ein Speicherkonto enthält Blobs, Dateien, Warteschlangen und Tabellen hinter einem öffentlichen Hostnamen je Dienst.',
  'A VPN Gateway terminates encrypted IPsec/IKE tunnels between Azure and an on-premises device or remote user.':
    'Ein VPN-Gateway terminiert verschlüsselte IPsec/IKE-Tunnel zwischen Azure und einem lokalen Gerät oder Remotebenutzer.',
  'A Virtual Machine is a server you run in Azure, with its own operating system and applications.':
    'Ein virtueller Computer ist ein Server, den Sie in Azure betreiben, mit eigenem Betriebssystem und eigenen Anwendungen.',
  'A Virtual Network is your private, isolated network in Azure, defined by one or more address ranges (CIDR blocks).':
    'Ein virtuelles Netzwerk ist Ihr privates, isoliertes Netzwerk in Azure, definiert durch einen oder mehrere Adressbereiche (CIDR-Blöcke).',
  'A Virtual WAN hub is the Microsoft-managed regional hub VNet that spokes and branches connect into.':
    'Ein Virtual-WAN-Hub ist das von Microsoft verwaltete regionale Hub-VNet, mit dem sich Spokes und Zweigstellen verbinden.',
  'A WAF policy is the rule set that inspects HTTP requests for common web attacks such as SQL injection and cross-site scripting.':
    'Eine WAF-Richtlinie ist der Regelsatz, der HTTP-Anforderungen auf gängige Webangriffe wie SQL-Injection und Cross-Site-Scripting prüft.',
  'A client application or device making the request.':
    'Eine Clientanwendung oder ein Gerät, das die Anforderung stellt.',
  'A command-line session such as PowerShell, Bash, or Azure CLI.':
    'Eine Befehlszeilensitzung wie PowerShell, Bash oder Azure CLI.',
  'A custom element added to represent something outside the standard Azure resource set.':
    'Ein benutzerdefiniertes Element, das etwas außerhalb des Standardsatzes an Azure-Ressourcen darstellt.',
  'A legitimate request being blocked shows up as a 403 — check the WAF logs for the triggering rule ID and add an exclusion.':
    'Eine blockierte legitime Anforderung erscheint als 403 — prüfen Sie in den WAF-Protokollen die auslösende Regel-ID und fügen Sie eine Ausnahme hinzu.',
  'A listener accepts the request on the front-end IP, a rule matches it, and the request is forwarded to a backend pool member that the health probe reports as healthy.':
    'Ein Listener nimmt die Anforderung an der Front-End-IP an, eine Regel greift, und die Anforderung wird an ein Back-End-Poolmitglied weitergeleitet, das der Integritätstest als fehlerfrei meldet.',
  'A load-balancing rule maps a front-end IP and port to a backend pool and port. It does not inspect or modify the payload, so it cannot route by URL.':
    'Eine Lastenausgleichsregel bildet eine Front-End-IP und einen Port auf einen Back-End-Pool und -Port ab. Sie prüft oder verändert die Nutzlast nicht und kann daher nicht anhand der URL routen.',
  'A missing or wrong prefix here is the single most common cause of "the tunnel is up but traffic does not pass".':
    'Ein fehlendes oder falsches Präfix ist hier die mit Abstand häufigste Ursache für „Der Tunnel steht, aber es fließt kein Verkehr“.',
  'A mobile device acting as the client.':
    'Ein Mobilgerät, das als Client fungiert.',
  'A person or role involved in the flow.':
    'Eine Person oder Rolle, die am Ablauf beteiligt ist.',
  'A portal error is control plane (ARM, RBAC, policy) — it is not evidence of a data-path problem.':
    'Ein Portalfehler betrifft die Steuerungsebene (ARM, RBAC, Richtlinie) — er ist kein Beleg für ein Problem im Datenpfad.',
  'A resource group is a logical container that holds related Azure resources.':
    'Eine Ressourcengruppe ist ein logischer Container, der zusammengehörige Azure-Ressourcen enthält.',
  'A resource group is a management construct only — it does not affect network reachability. Two resources in different resource groups talk to each other normally.':
    'Eine Ressourcengruppe ist ein reines Verwaltungskonstrukt — sie beeinflusst die Netzwerkerreichbarkeit nicht. Zwei Ressourcen in verschiedenen Ressourcengruppen kommunizieren ganz normal miteinander.',
  'A route table holds User-Defined Routes that override the routes Azure creates by default.':
    'Eine Routingtabelle enthält benutzerdefinierte Routen, die die von Azure standardmäßig erstellten Routen überschreiben.',
  'A server — typically an on-premises or third-party host outside Azure.':
    'Ein Server — typischerweise ein lokaler Host oder ein Drittanbieterhost außerhalb von Azure.',
  'A subnet is a slice of the VNet address space where resources actually get their IP addresses.':
    'Ein Subnetz ist ein Ausschnitt des VNet-Adressraums, in dem Ressourcen tatsächlich ihre IP-Adressen erhalten.',
  'A subscription is the billing and quota boundary that resources are created in.':
    'Ein Abonnement ist die Abrechnungs- und Kontingentgrenze, innerhalb derer Ressourcen erstellt werden.',
  'A user laptop or workstation.':
    'Ein Benutzerlaptop oder eine Arbeitsstation.',
  'AKS is managed Kubernetes — Azure runs the control plane and you run workloads in node pools.':
    'AKS ist verwaltetes Kubernetes — Azure betreibt die Steuerungsebene und Sie betreiben Workloads in Knotenpools.',
  'API Management is a gateway that publishes, secures, and throttles APIs.':
    'API Management ist ein Gateway, das APIs veröffentlicht, absichert und drosselt.',
  'Access can be restricted with the firewall and virtual network rules, or made fully private with a Private Endpoint per sub-resource (blob, file, and so on).':
    'Der Zugriff lässt sich über Firewall- und Netzwerkregeln einschränken oder mit einem privaten Endpunkt je Unterressource (Blob, File usw.) vollständig privat machen.',
  'Admins usually reach resources through the Azure portal, Bastion, or a jump host rather than the application front door.':
    'Administratoren erreichen Ressourcen in der Regel über das Azure-Portal, Bastion oder einen Sprunghost statt über den Anwendungseingang.',
  'An ASG is a label you attach to NICs so NSG rules can target a workload role instead of IP addresses.':
    'Eine ASG ist eine Kennzeichnung, die Sie an NICs anfügen, damit NSG-Regeln eine Workloadrolle statt IP-Adressen adressieren können.',
  'An Azure region is a set of datacenters in one geography that hosts your resources.':
    'Eine Azure-Region ist eine Gruppe von Rechenzentren in einem geografischen Raum, in denen Ihre Ressourcen gehostet werden.',
  'An ExpressRoute Gateway is the VNet-side endpoint that attaches a VNet to an ExpressRoute circuit.':
    'Ein ExpressRoute-Gateway ist der VNet-seitige Endpunkt, der ein VNet mit einer ExpressRoute-Leitung verbindet.',
  'An ExpressRoute circuit is a private Layer-3 connection between your network and Microsoft, provided by a connectivity partner.':
    'Eine ExpressRoute-Leitung ist eine private Layer-3-Verbindung zwischen Ihrem Netzwerk und Microsoft, bereitgestellt von einem Konnektivitätspartner.',
  'An INBOUND endpoint gives on-premises an IP in Azure to forward queries to. An OUTBOUND endpoint plus a forwarding ruleset sends Azure queries for specific domains to on-premises DNS servers.':
    'Ein EINGEHENDER Endpunkt stellt der lokalen Umgebung eine IP in Azure bereit, an die Abfragen weitergeleitet werden. Ein AUSGEHENDER Endpunkt plus Weiterleitungsregelsatz sendet Azure-Abfragen für bestimmte Domänen an lokale DNS-Server.',
  'An IP Group is a named, reusable collection of IP addresses and ranges.':
    'Eine IP-Gruppe ist eine benannte, wiederverwendbare Sammlung von IP-Adressen und -Bereichen.',
  'An NSG and a route table are attached at the subnet level, so every resource in the subnet inherits those rules. Some services require a dedicated, specially-named subnet (for example GatewaySubnet, AzureFirewallSubnet, AzureBastionSubnet).':
    'Eine NSG und eine Routingtabelle werden auf Subnetzebene zugewiesen, sodass jede Ressource im Subnetz diese Regeln erbt. Manche Dienste erfordern ein eigenes, speziell benanntes Subnetz (zum Beispiel GatewaySubnet, AzureFirewallSubnet, AzureBastionSubnet).',
  'An NSG is a stateful packet filter with allow and deny rules based on source, destination, port, and protocol.':
    'Eine NSG ist ein zustandsbehafteter Paketfilter mit Zulassungs- und Verweigerungsregeln auf Basis von Quelle, Ziel, Port und Protokoll.',
  'An NVA is a third-party firewall, router, or proxy running as a VM inside your VNet.':
    'Eine NVA ist eine Firewall, ein Router oder ein Proxy eines Drittanbieters, die bzw. der als VM in Ihrem VNet läuft.',
  'An administrator performing management or troubleshooting work.':
    'Ein Administrator, der Verwaltungs- oder Fehlerbehebungsarbeiten durchführt.',
  'An image pull failure over Private Link is nearly always DNS — verify the registry name resolves to the private IP.':
    'Ein fehlgeschlagener Imageabruf über Private Link liegt fast immer am DNS — prüfen Sie, ob der Registrierungsname zur privaten IP aufgelöst wird.',
  'App Service is a managed platform for hosting web apps and APIs without managing servers.':
    'App Service ist eine verwaltete Plattform zum Hosten von Web-Apps und APIs, ohne Server zu verwalten.',
  'Application Gateway for Containers is the Kubernetes-native Layer-7 ingress built on the Application Gateway platform.':
    'Application Gateway for Containers ist der Kubernetes-native Layer-7-Ingress auf Basis der Application-Gateway-Plattform.',
  'Application Gateway is a regional Layer-7 (HTTP/HTTPS) load balancer.':
    'Application Gateway ist ein regionaler Layer-7-Lastenausgleich (HTTP/HTTPS).',
  'Application rules need the FQDN; if the client resolves DNS differently, the rule will not match.':
    'Anwendungsregeln benötigen den FQDN; löst der Client DNS anders auf, greift die Regel nicht.',
  'Asymmetric routing is a classic failure — the return path must also traverse the firewall.':
    'Asymmetrisches Routing ist ein klassischer Fehler — auch der Rückweg muss die Firewall durchlaufen.',
  'Azure Bastion is a managed jump host that gives browser-based RDP and SSH access to VMs.':
    'Azure Bastion ist ein verwalteter Sprunghost, der browserbasierten RDP- und SSH-Zugriff auf VMs bietet.',
  'Azure Container Registry stores and serves your container images.':
    'Azure Container Registry speichert und liefert Ihre Containerimages.',
  'Azure Firewall is a managed, stateful network firewall that inspects traffic against DNAT, network, and application rules.':
    'Azure Firewall ist eine verwaltete, zustandsbehaftete Netzwerkfirewall, die den Verkehr anhand von DNAT-, Netzwerk- und Anwendungsregeln prüft.',
  'Azure Firewall rules reference the IP Group by name in the source or destination field.':
    'Azure-Firewall-Regeln verweisen im Quell- oder Zielfeld namentlich auf die IP-Gruppe.',
  'Azure Load Balancer is a Layer-4 (TCP/UDP) load balancer that spreads connections across a backend pool.':
    'Azure Load Balancer ist ein Layer-4-Lastenausgleich (TCP/UDP), der Verbindungen über einen Back-End-Pool verteilt.',
  'Azure SQL Database is a managed relational database service.':
    'Azure SQL-Datenbank ist ein verwalteter relationaler Datenbankdienst.',
  'Azure needs to know which address ranges live on the far side of the tunnel so it can route to them.':
    'Azure muss wissen, welche Adressbereiche sich auf der Gegenseite des Tunnels befinden, um dorthin routen zu können.',
  'Azure protects its platform by default, but a Network Protection plan tunes mitigation to YOUR traffic and adds attack telemetry plus cost protection.':
    'Azure schützt seine Plattform standardmäßig, doch ein Netzwerkschutzplan stimmt die Abwehr auf IHREN Verkehr ab und ergänzt Angriffstelemetrie sowie Kostenschutz.',
  'Because it is DNS-based, client-side DNS caching and TTL delay failover — check the TTL.':
    'Da es DNS-basiert ist, verzögern clientseitiges DNS-Caching und die TTL das Failover — prüfen Sie die TTL.',
  'Both the source and destination ASG must be in the SAME virtual network for a rule to work.':
    'Quell- und Ziel-ASG müssen sich im SELBEN virtuellen Netzwerk befinden, damit eine Regel funktioniert.',
  'Caching can mask a backend change — purge before concluding the backend is wrong.':
    'Caching kann eine Back-End-Änderung verdecken — leeren Sie den Cache, bevor Sie das Back-End für fehlerhaft erklären.',
  'Capture the exact command and full error text — it usually names the failing endpoint and port.':
    'Erfassen Sie den genauen Befehl und den vollständigen Fehlertext — darin werden meist der fehlschlagende Endpunkt und Port genannt.',
  'Check BGP session state and the advertised/received route counts on each peering.':
    'Prüfen Sie den BGP-Sitzungszustand sowie die Anzahl der angekündigten und empfangenen Routen je Peering.',
  'Check DDoS mitigation metrics before assuming an outage is application-side.':
    'Prüfen Sie die DDoS-Abwehrmetriken, bevor Sie eine Störung der Anwendungsseite zuschreiben.',
  'Check SNAT port utilisation metrics if outbound connections start failing intermittently.':
    'Prüfen Sie die Metriken zur SNAT-Portauslastung, wenn ausgehende Verbindungen sporadisch fehlschlagen.',
  'Check backend health first — an unhealthy pool returns 502.':
    'Prüfen Sie zuerst die Back-End-Integrität — ein fehlerhafter Pool liefert 502.',
  'Check connection status and the ingress/egress byte counters — zero bytes with a Connected state points at routing, not the tunnel.':
    'Prüfen Sie den Verbindungsstatus und die Byte-Zähler für ein- und ausgehenden Verkehr — null Bytes bei Status „Verbunden“ deutet auf das Routing hin, nicht auf den Tunnel.',
  'Check container logs and restart count first — an app crash looks like a network failure from outside.':
    'Prüfen Sie zuerst die Containerprotokolle und die Anzahl der Neustarts — ein Anwendungsabsturz sieht von außen wie ein Netzwerkfehler aus.',
  'Check effective routes and effective security rules on the NIC.':
    'Prüfen Sie die wirksamen Routen und die wirksamen Sicherheitsregeln auf der NIC.',
  'Check effective routes on a NIC in this VNet to see what next hop Azure is actually using.':
    'Prüfen Sie die wirksamen Routen auf einer NIC in diesem VNet, um zu sehen, welchen nächsten Hop Azure tatsächlich verwendet.',
  'Check effective routes on the NIC — that is the ground truth, not the route table definition.':
    'Prüfen Sie die wirksamen Routen auf der NIC — das ist die maßgebliche Wahrheit, nicht die Definition der Routingtabelle.',
  'Check endpoint monitor status; an endpoint marked Degraded is removed from responses.':
    'Prüfen Sie den Überwachungsstatus des Endpunkts; ein als beeinträchtigt markierter Endpunkt wird aus den Antworten entfernt.',
  'Check for a delete lock or Azure Policy assignment at this scope if a deployment is failing.':
    'Prüfen Sie auf eine Löschsperre oder eine Azure-Policy-Zuweisung in diesem Bereich, wenn eine Bereitstellung fehlschlägt.',
  'Check for asymmetric routing — both directions must traverse the same appliance instance.':
    'Prüfen Sie auf asymmetrisches Routing — beide Richtungen müssen dieselbe Appliance-Instanz durchlaufen.',
  'Check health probe status — if every instance is unhealthy the load balancer silently drops traffic.':
    'Prüfen Sie den Status des Integritätstests — sind alle Instanzen fehlerhaft, verwirft der Load Balancer den Verkehr stillschweigend.',
  'Check hub routing status and the effective routes for the connection in question.':
    'Prüfen Sie den Routingstatus des Hubs und die wirksamen Routen für die betreffende Verbindung.',
  'Check origin health probes and the origin host header setting — a mismatch causes 4xx from the origin.':
    'Prüfen Sie die Integritätstests des Ursprungs und die Einstellung des Ursprungs-Hostheaders — eine Abweichung führt zu 4xx vom Ursprung.',
  'Check priority ordering — a broad deny in a parent policy silently overrides a child allow.':
    'Prüfen Sie die Prioritätsreihenfolge — eine weit gefasste Verweigerung in einer übergeordneten Richtlinie hebt eine untergeordnete Zulassung stillschweigend auf.',
  'Check that the on-premises prefixes are present in the Local Network Gateway (or advertised via BGP).':
    'Prüfen Sie, ob die lokalen Präfixe im lokalen Netzwerkgateway vorhanden (oder per BGP angekündigt) sind.',
  'Check that the on-premises router actually advertises the local prefixes, and that it learns the Azure address space.':
    'Prüfen Sie, ob der lokale Router die lokalen Präfixe tatsächlich ankündigt und den Azure-Adressraum lernt.',
  'Check the A record exists and points at the expected IP.':
    'Prüfen Sie, ob der A-Eintrag vorhanden ist und auf die erwartete IP verweist.',
  'Check the ALB controller pod logs in the cluster.':
    'Prüfen Sie die Protokolle des ALB-Controller-Pods im Cluster.',
  'Check the NSG attached to this subnet — subnet rules are evaluated before NIC rules for inbound traffic.':
    'Prüfen Sie die diesem Subnetz zugewiesene NSG — bei eingehendem Verkehr werden Subnetzregeln vor NIC-Regeln ausgewertet.',
  'Check the connection state is Approved, not Pending.':
    'Prüfen Sie, ob der Verbindungsstatus „Genehmigt“ und nicht „Ausstehend“ lautet.',
  'Check the default rules — DenyAllInbound at priority 65500 catches anything you did not explicitly allow.':
    'Prüfen Sie die Standardregeln — DenyAllInbound mit Priorität 65500 fängt alles ab, was Sie nicht ausdrücklich zugelassen haben.',
  'Check the effective routes on the hub route table, not just on the spoke.':
    'Prüfen Sie die wirksamen Routen in der Routingtabelle des Hubs, nicht nur im Spoke.',
  'Check the firewall logs for the specific flow — they tell you which rule allowed or denied it.':
    'Prüfen Sie die Firewallprotokolle für den konkreten Datenfluss — sie zeigen, welche Regel ihn zugelassen oder verweigert hat.',
  'Check the forwarding ruleset is linked to the VNet, and that the rule domain name ends with a trailing dot.':
    'Prüfen Sie, ob der Weiterleitungsregelsatz mit dem VNet verknüpft ist und ob der Domänenname der Regel mit einem abschließenden Punkt endet.',
  'Check the number of routes learned — exceeding the route limit drops the BGP session.':
    'Prüfen Sie die Anzahl der gelernten Routen — wird das Routenlimit überschritten, bricht die BGP-Sitzung ab.',
  'Check the policy trace for the failing call — the answer is usually a policy, not the network.':
    'Prüfen Sie die Richtlinienablaufverfolgung für den fehlschlagenden Aufruf — die Ursache ist meist eine Richtlinie, nicht das Netzwerk.',
  'Check the route on the server itself — it must know to send the Azure prefixes to the tunnel.':
    'Prüfen Sie die Route auf dem Server selbst — er muss wissen, dass die Azure-Präfixe in den Tunnel zu senden sind.',
  'Check the route table attached to this subnet for a UDR that overrides the default system route.':
    'Prüfen Sie die diesem Subnetz zugewiesene Routingtabelle auf eine UDR, die die Standardsystemroute überschreibt.',
  'Check the service is actually available in this region (some SKUs are region-limited).':
    'Prüfen Sie, ob der Dienst in dieser Region tatsächlich verfügbar ist (manche SKUs sind regional eingeschränkt).',
  'Check the service type — ClusterIP is cluster-internal only, LoadBalancer creates an Azure load balancer.':
    'Prüfen Sie den Diensttyp — ClusterIP ist rein clusterintern, LoadBalancer erstellt einen Azure-Lastenausgleich.',
  'Check what the client resolves the name to, and from which network it is connecting.':
    'Prüfen Sie, zu welcher Adresse der Client den Namen auflöst und aus welchem Netzwerk er sich verbindet.',
  'Check whether Access Restrictions are blocking the caller.':
    'Prüfen Sie, ob Zugriffseinschränkungen den Aufrufer blockieren.',
  'Check whether the client is on the corporate network, on VPN, or on the public internet, because the path differs.':
    'Prüfen Sie, ob sich der Client im Unternehmensnetzwerk, im VPN oder im öffentlichen Internet befindet, denn der Pfad unterscheidet sich.',
  'Check whether unhealthy instances are being rolled — an instance can be up but failing its probe.':
    'Prüfen Sie, ob fehlerhafte Instanzen ausgetauscht werden — eine Instanz kann laufen und dennoch ihren Test nicht bestehen.',
  'Circuits are redundant by design — verify BOTH links, not just the primary.':
    'Leitungen sind konstruktionsbedingt redundant — prüfen Sie BEIDE Verbindungen, nicht nur die primäre.',
  'Client-side caching can hide a fix — flush the resolver cache before retesting.':
    'Clientseitiges Caching kann eine Korrektur verbergen — leeren Sie den Resolver-Cache vor dem erneuten Test.',
  'Compare a lookup and a connection test from the laptop against the same test run inside Azure.':
    'Vergleichen Sie eine Namensauflösung und einen Verbindungstest vom Laptop mit demselben Test innerhalb von Azure.',
  'Compare the IPsec policy on this connection with the on-premises configuration line by line.':
    'Vergleichen Sie die IPsec-Richtlinie dieser Verbindung Zeile für Zeile mit der lokalen Konfiguration.',
  'Compute platforms need somewhere private and close to pull images from at deployment time.':
    'Computeplattformen benötigen zum Bereitstellungszeitpunkt eine private und nahe gelegene Quelle, aus der sie Images abrufen können.',
  'Confirm IP forwarding is enabled if this NIC belongs to an NVA that must route traffic for others.':
    'Vergewissern Sie sich, dass die IP-Weiterleitung aktiviert ist, wenn diese NIC zu einer NVA gehört, die Verkehr für andere routen muss.',
  'Confirm a UDR actually forces the traffic through the firewall; without it traffic bypasses the firewall entirely.':
    'Vergewissern Sie sich, dass eine UDR den Verkehr tatsächlich durch die Firewall zwingt; ohne sie umgeht der Verkehr die Firewall vollständig.',
  'Confirm a virtual network link exists between the zone and the client VNet — without it the zone is invisible.':
    'Vergewissern Sie sich, dass eine Verknüpfung zum virtuellen Netzwerk zwischen der Zone und dem Client-VNet besteht — ohne sie ist die Zone unsichtbar.',
  'Confirm backend certificate validation settings if the backend uses a private CA.':
    'Prüfen Sie die Einstellungen zur Back-End-Zertifikatvalidierung, wenn das Back-End eine private Zertifizierungsstelle verwendet.',
  'Confirm both sides of the flow are in the region you expect — cross-region hops add latency and egress charges.':
    'Vergewissern Sie sich, dass beide Seiten des Datenflusses in der erwarteten Region liegen — regionsübergreifende Hops erhöhen Latenz und Ausgangskosten.',
  'Confirm the NIC really is a member — an unassigned NIC silently falls through to the deny rule.':
    'Vergewissern Sie sich, dass die NIC wirklich Mitglied ist — eine nicht zugewiesene NIC fällt stillschweigend auf die Verweigerungsregel durch.',
  'Confirm the NSG on the Application Gateway subnet allows the required inbound ports from the GatewayManager service tag.':
    'Vergewissern Sie sich, dass die NSG im Application-Gateway-Subnetz die erforderlichen eingehenden Ports vom Diensttag GatewayManager zulässt.',
  'Confirm the NSG on the backend NICs or subnet allows the probe source (AzureLoadBalancer service tag) and the data port.':
    'Vergewissern Sie sich, dass die NSG auf den Back-End-NICs oder dem Subnetz die Testquelle (Diensttag AzureLoadBalancer) und den Datenport zulässt.',
  'Confirm the Private DNS Zone is linked to the VNet the client sits in, and that the A record exists.':
    'Vergewissern Sie sich, dass die private DNS-Zone mit dem VNet des Clients verknüpft ist und dass der A-Eintrag vorhanden ist.',
  'Confirm the UDR next hop points at the NVA private IP (or the internal load balancer front end for an HA pair).':
    'Vergewissern Sie sich, dass der nächste Hop der UDR auf die private IP der NVA verweist (bzw. auf das Front-End des internen Lastenausgleichs bei einem HA-Paar).',
  'Confirm the VNet DNS setting (Azure-provided vs custom DNS servers) matches what the workload expects.':
    'Vergewissern Sie sich, dass die DNS-Einstellung des VNets (von Azure bereitgestellt oder benutzerdefinierte DNS-Server) dem entspricht, was die Workload erwartet.',
  'Confirm the VNet connection propagates to, and associates with, the route tables you expect.':
    'Vergewissern Sie sich, dass die VNet-Verbindung zu den erwarteten Routingtabellen propagiert und mit ihnen verknüpft ist.',
  'Confirm the VNet is actually associated with the plan.':
    'Vergewissern Sie sich, dass das VNet tatsächlich mit dem Plan verknüpft ist.',
  'Confirm the address is actually associated with the resource you think it is.':
    'Vergewissern Sie sich, dass die Adresse tatsächlich der Ressource zugeordnet ist, die Sie vermuten.',
  'Confirm the address you expect is really in the group — a missing entry looks exactly like a firewall deny.':
    'Vergewissern Sie sich, dass die erwartete Adresse wirklich in der Gruppe enthalten ist — ein fehlender Eintrag sieht genau wie eine Firewallverweigerung aus.',
  'Confirm the admin path (Bastion, VPN, or portal) separately — it can fail while the app path works.':
    'Prüfen Sie den Administrationspfad (Bastion, VPN oder Portal) separat — er kann fehlschlagen, während der Anwendungspfad funktioniert.',
  'Confirm the application is actually listening on the expected port (netstat or ss).':
    'Vergewissern Sie sich, dass die Anwendung tatsächlich am erwarteten Port lauscht (netstat oder ss).',
  'Confirm the association subnet is delegated correctly and has free addresses.':
    'Vergewissern Sie sich, dass das Zuordnungssubnetz korrekt delegiert ist und über freie Adressen verfügt.',
  'Confirm the circuit status is Provisioned and the peering is configured on both the provider and Microsoft side.':
    'Vergewissern Sie sich, dass der Leitungsstatus „Bereitgestellt“ lautet und das Peering sowohl auf Anbieter- als auch auf Microsoft-Seite konfiguriert ist.',
  'Confirm the consumer connection request has been approved.':
    'Vergewissern Sie sich, dass die Verbindungsanforderung des Verbrauchers genehmigt wurde.',
  'Confirm the gateway SKU supports the required throughput and the number of circuit connections.':
    'Vergewissern Sie sich, dass die Gateway-SKU den erforderlichen Durchsatz und die Anzahl der Leitungsverbindungen unterstützt.',
  'Confirm the local firewall and any host-based firewall permit the flow in both directions.':
    'Vergewissern Sie sich, dass die lokale Firewall und jede hostbasierte Firewall den Datenfluss in beide Richtungen zulassen.',
  'Confirm the on-premises conditional forwarder points at the inbound endpoint IP, and that UDP and TCP port 53 are open across the tunnel.':
    'Vergewissern Sie sich, dass die lokale bedingte Weiterleitung auf die IP des eingehenden Endpunkts zeigt und dass UDP- und TCP-Port 53 über den Tunnel geöffnet sind.',
  'Confirm the on-premises firewall permits the required ports in BOTH directions.':
    'Vergewissern Sie sich, dass die lokale Firewall die erforderlichen Ports in BEIDE Richtungen zulässt.',
  'Confirm the origin only accepts traffic from Front Door (X-Azure-FDID header or the AzureFrontDoor.Backend service tag).':
    'Vergewissern Sie sich, dass der Ursprung nur Verkehr von Front Door annimmt (Header X-Azure-FDID oder Diensttag AzureFrontDoor.Backend).',
  'Confirm the hosting plan supports the networking feature you need — the classic Consumption plan has no VNet integration, while Flex Consumption and Premium do.': 'Prüfen Sie, ob der Hostingplan die benötigte Netzwerkfunktion unterstützt — der klassische Consumption-Plan bietet keine VNet-Integration, Flex Consumption und Premium hingegen schon.',
  'Confirm the policy is actually associated with the firewall handling this traffic.':
    'Vergewissern Sie sich, dass die Richtlinie tatsächlich mit der Firewall verknüpft ist, die diesen Verkehr verarbeitet.',
  'Confirm the public IP matches the on-premises device address seen from the internet after NAT.':
    'Vergewissern Sie sich, dass die öffentliche IP der Adresse des lokalen Geräts entspricht, wie sie nach NAT aus dem Internet sichtbar ist.',
  'Confirm the pulling identity has the AcrPull role.':
    'Vergewissern Sie sich, dass die abrufende Identität über die Rolle AcrPull verfügt.',
  'Confirm the server firewall rules or Private Endpoint permit the client.':
    'Vergewissern Sie sich, dass die Serverfirewallregeln oder der private Endpunkt den Client zulassen.',
  'Confirm the subnet has enough free addresses for the maximum pods per node under Azure CNI.':
    'Vergewissern Sie sich, dass das Subnetz genügend freie Adressen für die maximale Anzahl an Pods pro Knoten unter Azure CNI bietet.',
  'Confirm the subnet is large enough — Azure reserves 5 addresses in every subnet.':
    'Vergewissern Sie sich, dass das Subnetz groß genug ist — Azure reserviert in jedem Subnetz 5 Adressen.',
  'Confirm the tunnel is Connected, not just Provisioned.':
    'Vergewissern Sie sich, dass der Tunnel den Status „Verbunden“ hat und nicht nur „Bereitgestellt“.',
  'Confirm the upgrade policy is not mid-rollout when investigating inconsistent behaviour.':
    'Vergewissern Sie sich, dass sich die Upgraderichtlinie nicht mitten in einer Einführung befindet, wenn Sie inkonsistentes Verhalten untersuchen.',
  'Confirm what the client actually resolves the name to — a wrong DNS answer sends traffic to the wrong place.':
    'Prüfen Sie, zu welcher Adresse der Client den Namen tatsächlich auflöst — eine falsche DNS-Antwort schickt den Verkehr an den falschen Ort.',
  'Confirm whether the policy is in Detection or Prevention mode before concluding it is not the cause.':
    'Prüfen Sie, ob sich die Richtlinie im Erkennungs- oder im Verhinderungsmodus befindet, bevor Sie sie als Ursache ausschließen.',
  'Consumers create a Private Endpoint that requests a connection; you approve it. Traffic arrives with the source NAT applied by the platform.':
    'Verbraucher erstellen einen privaten Endpunkt, der eine Verbindung anfordert; Sie genehmigen sie. Der Verkehr trifft mit dem von der Plattform angewendeten Quell-NAT ein.',
  'Container Instances runs a single container without any cluster to manage.':
    'Container Instances führt einen einzelnen Container aus, ohne dass ein Cluster verwaltet werden muss.',
  'Cosmos DB is a globally distributed NoSQL database with low-latency reads and writes.':
    'Cosmos DB ist eine global verteilte NoSQL-Datenbank mit Lese- und Schreibvorgängen bei geringer Latenz.',
  'Cross-subscription peering and Private Link need permissions in BOTH subscriptions.':
    'Abonnementübergreifendes Peering und Private Link erfordern Berechtigungen in BEIDEN Abonnements.',
  'Customers use one when they need a specific vendor feature set, or want the same appliance on-premises and in Azure.':
    'Kunden setzen sie ein, wenn sie einen bestimmten Herstellerfunktionsumfang benötigen oder lokal und in Azure dieselbe Appliance einsetzen möchten.',
  'DNS Private Resolver is a managed service that resolves DNS between on-premises and Azure without you running DNS server VMs.':
    'DNS Private Resolver ist ein verwalteter Dienst, der DNS zwischen lokaler Umgebung und Azure auflöst, ohne dass Sie DNS-Server-VMs betreiben müssen.',
  'DNS is the number-one cause of failure — run a lookup from the client and confirm it returns the private IP, not the public one.':
    'DNS ist die häufigste Fehlerursache — führen Sie vom Client aus eine Abfrage durch und prüfen Sie, ob die private und nicht die öffentliche IP zurückgegeben wird.',
  'Direct mode needs TCP 10250-10255 and 10000-20000 open; gateway mode only needs 443.':
    'Der Direktmodus erfordert offene TCP-Ports 10250-10255 und 10000-20000; der Gatewaymodus benötigt nur 443.',
  'Each sub-resource needs its OWN Private Endpoint and its own privatelink DNS zone.':
    'Jede Unterressource benötigt einen EIGENEN privaten Endpunkt und eine eigene privatelink-DNS-Zone.',
  'Effective routes and effective security rules are both read from the NIC — always start here.':
    'Wirksame Routen und wirksame Sicherheitsregeln werden beide von der NIC gelesen — beginnen Sie immer hier.',
  'Enable VNet flow logs for a historical record of allow and deny decisions.':
    'Aktivieren Sie VNet-Flussprotokolle für eine historische Aufzeichnung der Zulassungs- und Verweigerungsentscheidungen.',
  'Every traffic flow needs an origin — this is the person or application whose experience you are troubleshooting.':
    'Jeder Datenfluss braucht einen Ursprung — das ist die Person oder Anwendung, deren Erfahrung Sie untersuchen.',
  'Everything drawn inside this boundary is deployed in the same region, so traffic between those resources stays on the regional network rather than crossing the internet.':
    'Alles innerhalb dieser Grenze wird in derselben Region bereitgestellt, sodass der Verkehr zwischen diesen Ressourcen im regionalen Netzwerk bleibt und nicht über das Internet läuft.',
  'Firewall Policy is the reusable rule container that one or more Azure Firewalls apply.':
    'Die Firewallrichtlinie ist der wiederverwendbare Regelcontainer, den eine oder mehrere Azure-Firewalls anwenden.',
  'For Private Endpoints, the zone name must match the required pattern exactly (for example privatelink.blob.core.windows.net).':
    'Bei privaten Endpunkten muss der Zonenname exakt dem geforderten Muster entsprechen (zum Beispiel privatelink.blob.core.windows.net).',
  'For Standard SKU, remember inbound is closed by default until an NSG rule opens it.':
    'Denken Sie bei der Standard-SKU daran, dass eingehender Verkehr standardmäßig gesperrt ist, bis eine NSG-Regel ihn öffnet.',
  'For TLS errors, check certificate expiry, chain, and whether the backend hostname matches the certificate.':
    'Prüfen Sie bei TLS-Fehlern Ablaufdatum und Kette des Zertifikats sowie, ob der Back-End-Hostname zum Zertifikat passt.',
  'For an internal load balancer, confirm the client is on a network that can reach the private front-end IP.':
    'Vergewissern Sie sich bei einem internen Lastenausgleich, dass sich der Client in einem Netzwerk befindet, das die private Front-End-IP erreichen kann.',
  'For inbound: confirm the public IP, the NSG allow rule, and the health of the backend.':
    'Für eingehenden Verkehr: Prüfen Sie die öffentliche IP, die NSG-Zulassungsregel und die Integrität des Back-Ends.',
  'For outbound VNet integration, WEBSITE_DNS_SERVER and route-all settings decide whether traffic uses VNet DNS and routes.':
    'Bei der ausgehenden VNet-Integration entscheiden die Einstellungen WEBSITE_DNS_SERVER und route-all, ob der Verkehr VNet-DNS und -Routen nutzt.',
  'For outbound: confirm an explicit method exists — a NAT Gateway, a load balancer outbound rule, or a public IP on the NIC. Default outbound access was retired on 30 September 2025, so a new VM without one of these has no internet access at all.': 'Für ausgehenden Datenverkehr: Stellen Sie sicher, dass eine explizite Methode vorhanden ist — ein NAT Gateway, eine Lastenausgleichs-Ausgangsregel oder eine öffentliche IP an der NIC. Der standardmäßige ausgehende Zugriff wurde am 30. September 2025 eingestellt, eine neue VM ohne eine dieser Optionen hat daher überhaupt keinen Internetzugang.',
  'Front Door is a global Layer-7 entry point with content delivery and WAF built in.':
    'Front Door ist ein globaler Layer-7-Einstiegspunkt mit integrierter Inhaltsbereitstellung und WAF.',
  'Gateway, Firewall, and Bastion subnets must use their exact reserved names or deployment fails.':
    'Gateway-, Firewall- und Bastion-Subnetze müssen exakt ihre reservierten Namen tragen, sonst schlägt die Bereitstellung fehl.',
  'Hybrid flows depend on it, and it is frequently the piece nobody has console access to during a call.':
    'Hybride Datenflüsse hängen davon ab, und es ist häufig das Element, auf das während eines Gesprächs niemand Konsolenzugriff hat.',
  'IKE phase 1/2 settings, PSK, and the IPsec policy must match EXACTLY on both ends.':
    'Die Einstellungen für IKE-Phase 1/2, der PSK und die IPsec-Richtlinie müssen auf beiden Seiten EXAKT übereinstimmen.',
  'IP forwarding must be enabled on the NVA NIC in Azure AND inside the guest OS.':
    'Die IP-Weiterleitung muss auf der NVA-NIC in Azure UND im Gastbetriebssystem aktiviert sein.',
  'If the account firewall is set to selected networks, confirm the caller subnet or IP is listed.':
    'Ist die Kontofirewall auf ausgewählte Netzwerke eingestellt, prüfen Sie, ob das Subnetz oder die IP des Aufrufers aufgeführt ist.',
  'If the firewall is restricted, confirm the caller network or the trusted-services exception is allowed.':
    'Ist die Firewall eingeschränkt, prüfen Sie, ob das Netzwerk des Aufrufers oder die Ausnahme für vertrauenswürdige Dienste zugelassen ist.',
  'Inbound and outbound are configured independently — confirm which direction is failing.':
    'Eingehend und ausgehend werden unabhängig voneinander konfiguriert — stellen Sie fest, welche Richtung fehlschlägt.',
  'Inbound and outbound endpoints each need their own delegated subnet.':
    'Eingehende und ausgehende Endpunkte benötigen jeweils ein eigenes delegiertes Subnetz.',
  'Inbound internet traffic lands on a public IP attached to a gateway, load balancer, or VM. Outbound traffic leaves through a NAT Gateway, a load balancer, or a firewall.':
    'Eingehender Internetverkehr landet auf einer öffentlichen IP, die einem Gateway, Load Balancer oder einer VM zugewiesen ist. Ausgehender Verkehr verlässt die Umgebung über ein NAT-Gateway, einen Load Balancer oder eine Firewall.',
  'Inbound private access uses a Private Endpoint. Outbound access into a VNet uses regional VNet integration — the two are separate features.':
    'Der eingehende private Zugriff nutzt einen privaten Endpunkt. Der ausgehende Zugriff in ein VNet nutzt die regionale VNet-Integration — beides sind getrennte Funktionen.',
  'Individual public IPs are then allocated from the prefix and assigned to resources such as a NAT Gateway or load balancer.':
    'Einzelne öffentliche IPs werden anschließend aus dem Präfix zugeteilt und Ressourcen wie einem NAT-Gateway oder Load Balancer zugewiesen.',
  'Instances share one network configuration and normally sit in a load balancer or Application Gateway backend pool.':
    'Instanzen teilen sich eine Netzwerkkonfiguration und liegen normalerweise in einem Back-End-Pool eines Load Balancers oder Application Gateways.',
  'It answers "is this being blocked, and by what?" with data instead of guesswork.':
    'Es beantwortet die Frage „Wird das blockiert, und wodurch?“ mit Daten statt mit Vermutungen.',
  'It attaches to Application Gateway or Front Door and runs in Detection mode (log only) or Prevention mode (block).':
    'Sie wird an Application Gateway oder Front Door angefügt und läuft im Erkennungsmodus (nur protokollieren) oder im Verhinderungsmodus (blockieren).',
  'It attaches to a subnet, a NIC, or both. Rules are evaluated by priority, lowest number first, and the first match wins. Because it is stateful, return traffic for an allowed flow is permitted automatically.':
    'Sie wird einem Subnetz, einer NIC oder beidem zugewiesen. Regeln werden nach Priorität ausgewertet, niedrigste Nummer zuerst, und die erste Übereinstimmung gewinnt. Da sie zustandsbehaftet ist, wird Rückverkehr eines zugelassenen Datenflusses automatisch erlaubt.',
  'It attaches to a subnet. Azure picks the most specific matching prefix; if two routes tie, a UDR beats a BGP route, which beats a system route.':
    'Sie wird einem Subnetz zugewiesen. Azure wählt das spezifischste passende Präfix; bei Gleichstand schlägt eine UDR eine BGP-Route, und diese schlägt eine Systemroute.',
  'It attaches to one or more subnets. Once attached, it takes priority over all other outbound methods for those subnets. It never allows unsolicited inbound traffic.':
    'Es wird einem oder mehreren Subnetzen zugewiesen. Einmal zugewiesen, hat es für diese Subnetze Vorrang vor allen anderen Ausgangsmethoden. Unaufgeforderten eingehenden Verkehr lässt es niemals zu.',
  'It avoids the public internet entirely, giving predictable latency, higher bandwidth, and an SLA.':
    'Sie umgeht das öffentliche Internet vollständig und bietet vorhersehbare Latenz, höhere Bandbreite und eine SLA.',
  'It blocks application-layer attacks that a Layer-4 firewall or NSG cannot see, because those only look at IP and port.':
    'Sie blockiert Angriffe auf Anwendungsebene, die eine Layer-4-Firewall oder NSG nicht erkennen kann, da diese nur IP und Port betrachten.',
  'It can be deployed into a VNet subnet for private access, or given a public IP for direct access.':
    'Er kann für privaten Zugriff in ein VNet-Subnetz bereitgestellt oder für direkten Zugriff mit einer öffentlichen IP versehen werden.',
  'It can be external (public front end) or internal (VNet-only). In VNet mode it has strict required NSG rules and dependency endpoints.':
    'Es kann extern (öffentliches Front-End) oder intern (nur VNet) sein. Im VNet-Modus gelten strenge Pflicht-NSG-Regeln und Abhängigkeitsendpunkte.',
  'It can be reached publicly, or privately through a Private Endpoint with the matching Private DNS Zone.':
    'Sie ist öffentlich erreichbar oder privat über einen privaten Endpunkt mit der passenden privaten DNS-Zone.',
  'It cannot be used for inbound; if inbound is needed, that is a separate load balancer or public IP.':
    'Es kann nicht für eingehenden Verkehr verwendet werden; wird eingehender Verkehr benötigt, ist dafür ein separater Load Balancer oder eine öffentliche IP nötig.',
  'It carries the shared key, the IPsec/IKE policy, and the BGP setting for that specific link.':
    'Sie enthält den gemeinsamen Schlüssel, die IPsec/IKE-Richtlinie und die BGP-Einstellung für genau diese Verbindung.',
  'It centralises egress control and logging, so one policy governs what an entire hub-and-spoke estate is allowed to reach.':
    'Sie zentralisiert Ausgangskontrolle und Protokollierung, sodass eine einzige Richtlinie bestimmt, was eine gesamte Hub-and-Spoke-Landschaft erreichen darf.',
  'It clarifies who experiences the behaviour being described.':
    'Es verdeutlicht, wer das beschriebene Verhalten erlebt.',
  'It connects from the office LAN, from home, or through a VPN client, and each path resolves DNS differently.':
    'Er verbindet sich über das Büro-LAN, von zu Hause oder über einen VPN-Client, und jeder Pfad löst DNS anders auf.',
  'It connects over the public internet unless a VPN profile is applied.':
    'Es verbindet sich über das öffentliche Internet, sofern kein VPN-Profil angewendet wird.',
  'It connects to Azure through a Site-to-Site VPN tunnel or an ExpressRoute circuit. Routes are exchanged either statically or via BGP.':
    'Es verbindet sich über einen Site-to-Site-VPN-Tunnel oder eine ExpressRoute-Leitung mit Azure. Routen werden entweder statisch oder per BGP ausgetauscht.',
  'It connects to a subnet through a NIC. Its reachability is governed by the NSG on that NIC and on the subnet, plus the guest OS firewall.':
    'Er verbindet sich über eine NIC mit einem Subnetz. Seine Erreichbarkeit bestimmen die NSG auf dieser NIC und auf dem Subnetz sowie die Firewall des Gastbetriebssystems.',
  'It gives container workloads scheduling, self-healing, and scaling without you operating Kubernetes masters.':
    'Es bietet Containerworkloads Planung, Selbstheilung und Skalierung, ohne dass Sie Kubernetes-Master betreiben müssen.',
  'It gives one consistent front door for many backends, with authentication, rate limiting, and transformation applied by policy.':
    'Es bietet einen einheitlichen Eingang für viele Back-Ends, mit per Richtlinie angewendeter Authentifizierung, Ratenbegrenzung und Transformation.',
  'It gives you a predictable, unchanging range so partners and firewalls can allow-list your egress addresses once.':
    'Es liefert Ihnen einen vorhersehbaren, unveränderlichen Bereich, sodass Partner und Firewalls Ihre Ausgangsadressen einmalig freigeben können.',
  'It gives you a stable, known egress address and a very large pool of SNAT ports, which prevents the port-exhaustion failures common with default outbound access.':
    'Es liefert Ihnen eine stabile, bekannte Ausgangsadresse und einen sehr großen Pool an SNAT-Ports, was die beim standardmäßigen ausgehenden Zugriff üblichen Portausschöpfungsfehler verhindert.',
  'It gives you private connectivity into the VNet over the public internet, without exposing resources publicly.':
    'Es bietet Ihnen private Konnektivität in das VNet über das öffentliche Internet, ohne Ressourcen öffentlich verfügbar zu machen.',
  'It gives your resources private IP addresses and a security boundary, so they can talk to each other privately instead of over the public internet.':
    'Es gibt Ihren Ressourcen private IP-Adressen und eine Sicherheitsgrenze, sodass sie privat statt über das öffentliche Internet miteinander kommunizieren.',
  'It groups resources with a shared lifecycle so they can be deployed, permissioned, and deleted together.':
    'Sie gruppiert Ressourcen mit gemeinsamem Lebenszyklus, damit sie zusammen bereitgestellt, berechtigt und gelöscht werden können.',
  'It handles scale and instance repair for you, so capacity follows demand without manual VM creation.':
    'Sie übernimmt Skalierung und Instanzreparatur für Sie, sodass die Kapazität der Nachfrage folgt, ohne dass VMs manuell erstellt werden.',
  'It injects the routes learned from on-premises into the VNet and forwards traffic onto the private circuit.':
    'Es fügt die aus der lokalen Umgebung gelernten Routen in das VNet ein und leitet den Verkehr auf die private Leitung weiter.',
  'It is deployed into a dedicated AzureBastionSubnet. The admin connects to the Azure portal over TLS, and Bastion opens the RDP or SSH session to the VM private IP.':
    'Es wird in ein dediziertes AzureBastionSubnet bereitgestellt. Der Administrator verbindet sich über TLS mit dem Azure-Portal, und Bastion öffnet die RDP- oder SSH-Sitzung zur privaten IP der VM.',
  'It is enabled per region. IP flow verify names the exact NSG rule that allowed or denied a flow; next hop shows where a packet would actually be routed.':
    'Es wird je Region aktiviert. Die IP-Flussüberprüfung nennt exakt die NSG-Regel, die einen Datenfluss zugelassen oder verweigert hat; der nächste Hop zeigt, wohin ein Paket tatsächlich geroutet würde.',
  'It is reached over HTTPS. It can be locked down with firewall rules or a Private Endpoint, and callers usually authenticate with a managed identity.':
    'Er wird über HTTPS erreicht. Er lässt sich mit Firewallregeln oder einem privaten Endpunkt absichern, und Aufrufer authentifizieren sich meist mit einer verwalteten Identität.',
  'It is reached over TCP 1433. The connection policy is Redirect (which also needs ports 11000-11999) or Proxy (1433 only).':
    'Sie wird über TCP 1433 erreicht. Die Verbindungsrichtlinie ist Redirect (wofür zusätzlich die Ports 11000-11999 nötig sind) oder Proxy (nur 1433).',
  'It is referenced by a Connection resource, which pairs it with the Azure VPN Gateway. With BGP, the prefix list is learned dynamically instead.':
    'Es wird von einer Verbindungsressource referenziert, die es mit dem Azure-VPN-Gateway koppelt. Mit BGP wird die Präfixliste stattdessen dynamisch gelernt.',
  'It is the basic segmentation control in Azure, but it does not deny by default: the built-in AllowVNetInBound rule already permits all traffic inside the virtual network, so segmentation starts only when you add your own higher-priority deny.': 'Es ist das grundlegende Segmentierungssteuerelement in Azure, verweigert aber nicht standardmäßig: Die integrierte Regel AllowVNetInBound lässt bereits den gesamten Datenverkehr innerhalb des virtuellen Netzwerks zu. Segmentierung beginnt daher erst, wenn Sie eine eigene Verweigerungsregel mit höherer Priorität hinzufügen.',
  'It is the control plane. Control-plane and data-plane failures look similar to users but have different causes.':
    'Es ist die Steuerungsebene. Fehler der Steuerungs- und der Datenebene sehen für Benutzer ähnlich aus, haben aber unterschiedliche Ursachen.',
  'It is the destination doing the actual work — serving the page, running the query, hosting the application.':
    'Es ist das Ziel, das die eigentliche Arbeit leistet — die Seite ausliefern, die Abfrage ausführen, die Anwendung hosten.',
  'It is the general-purpose durable store that most workloads read from and write to.':
    'Es ist der universelle, dauerhafte Speicher, aus dem die meisten Workloads lesen und in den sie schreiben.',
  'It is the most common place a reported issue is actually observed.':
    'Es ist der häufigste Ort, an dem ein gemeldetes Problem tatsächlich beobachtet wird.',
  'It is what makes a resource reachable from the internet, and it identifies your traffic when it leaves Azure.':
    'Sie macht eine Ressource aus dem Internet erreichbar und identifiziert Ihren Verkehr, wenn er Azure verlässt.',
  'It is where a VM gets its IP configuration, and it is the most precise place to attach an NSG or check what rules and routes actually apply.':
    'Dort erhält eine VM ihre IP-Konfiguration, und es ist die genaueste Stelle, um eine NSG anzufügen oder zu prüfen, welche Regeln und Routen tatsächlich gelten.',
  'It keeps credentials out of code and configuration, and gives you an audit trail of who read what.':
    'Er hält Anmeldeinformationen aus Code und Konfiguration heraus und liefert einen Prüfpfad darüber, wer was gelesen hat.',
  'It keeps firewall rules readable and lets you update one object instead of editing many rules.':
    'Sie hält Firewallregeln lesbar und erlaubt es, ein einziges Objekt zu aktualisieren, statt viele Regeln zu bearbeiten.',
  'It keeps rules meaningful as the environment scales — "web can reach app" survives every IP change.':
    'Sie hält Regeln auch bei wachsender Umgebung aussagekräftig — „web kann app erreichen“ übersteht jede IP-Änderung.',
  'It lets AKS workloads use Gateway API and Ingress objects to publish services without hand-managing gateway configuration.':
    'Es ermöglicht AKS-Workloads, Dienste über Gateway-API- und Ingress-Objekte zu veröffentlichen, ohne die Gatewaykonfiguration manuell zu verwalten.',
  'It lets you offer a service to customers or other business units without peering networks or exposing anything publicly.':
    'Es ermöglicht Ihnen, Kunden oder anderen Geschäftsbereichen einen Dienst anzubieten, ohne Netzwerke zu peeren oder etwas öffentlich verfügbar zu machen.',
  'It lets you reach a PaaS service such as Storage or SQL over a private IP on the Microsoft backbone, so the public endpoint can be disabled entirely.':
    'Er ermöglicht es, einen PaaS-Dienst wie Storage oder SQL über eine private IP im Microsoft-Backbone zu erreichen, sodass der öffentliche Endpunkt vollständig deaktiviert werden kann.',
  'It lets you write rules once and inherit them across firewalls, with a parent policy for organisation-wide rules and child policies per environment.':
    'Sie erlaubt es, Regeln einmal zu schreiben und über mehrere Firewalls zu vererben, mit einer übergeordneten Richtlinie für organisationsweite Regeln und untergeordneten Richtlinien je Umgebung.',
  'It lives in the reserved GatewaySubnet and pairs with a Local Network Gateway (the remote device) through a Connection resource. Routes are static or learned via BGP.':
    'Es liegt im reservierten GatewaySubnet und wird über eine Verbindungsressource mit einem lokalen Netzwerkgateway (dem Gegenstellengerät) gekoppelt. Routen sind statisch oder werden per BGP gelernt.',
  'It marks where the user-visible experience begins, which is the perspective the customer is reporting from.':
    'Es markiert den Beginn der für Benutzer sichtbaren Erfahrung — also die Perspektive, aus der der Kunde berichtet.',
  'It never sees your traffic. It only returns a CNAME or IP in a DNS answer, so the client connects directly to the chosen endpoint afterwards.':
    'Er sieht Ihren Verkehr nie. Er gibt lediglich einen CNAME oder eine IP in einer DNS-Antwort zurück, sodass sich der Client anschließend direkt mit dem gewählten Endpunkt verbindet.',
  'It only works if DNS resolves the service hostname to the private IP. That is normally done with a Private DNS Zone linked to the VNet.':
    'Es funktioniert nur, wenn DNS den Diensthostnamen zur privaten IP auflöst. Dies geschieht normalerweise über eine mit dem VNet verknüpfte private DNS-Zone.',
  'It provides a SQL Server-compatible database without you patching, backing up, or clustering servers.':
    'Sie stellt eine SQL-Server-kompatible Datenbank bereit, ohne dass Sie Server patchen, sichern oder clustern müssen.',
  'It provides high availability and scale — if one backend instance fails its health probe, new connections stop going to it.':
    'Er bietet Hochverfügbarkeit und Skalierung — besteht eine Back-End-Instanz ihren Integritätstest nicht, erhält sie keine neuen Verbindungen mehr.',
  'It provides transit routing between everything attached to it, without you having to build gateway chaining or route tables by hand.':
    'Er bietet Transitrouting zwischen allem, was daran angebunden ist, ohne dass Sie Gatewayverkettungen oder Routingtabellen von Hand aufbauen müssen.',
  'It reaches Azure APIs over HTTPS, or reaches workloads directly over SSH, RDP, or an application port.':
    'Er erreicht Azure-APIs über HTTPS oder Workloads direkt über SSH, RDP oder einen Anwendungsport.',
  'It reaches Azure across a VPN tunnel or ExpressRoute circuit, or over the public internet.':
    'Er erreicht Azure über einen VPN-Tunnel, eine ExpressRoute-Leitung oder das öffentliche Internet.',
  'It removes OS patching and scaling work, so teams ship application code instead of infrastructure.':
    'Es beseitigt Patch- und Skalierungsarbeiten am Betriebssystem, sodass Teams Anwendungscode statt Infrastruktur ausliefern.',
  'It removes the need to give VMs public IPs or open 3389/22 to the internet, which is one of the most exploited misconfigurations.':
    'Es macht es überflüssig, VMs öffentliche IPs zu geben oder 3389/22 zum Internet zu öffnen — eine der am häufigsten ausgenutzten Fehlkonfigurationen.',
  'It removes the work of building and maintaining your own hubs, route tables, and gateway meshes across many regions and branches.':
    'Es erspart die Arbeit, eigene Hubs, Routingtabellen und Gatewaynetze über viele Regionen und Zweigstellen hinweg aufzubauen und zu pflegen.',
  'It represents scripted or interactive commands, which are often where the reproduction steps live.':
    'Es steht für skriptgesteuerte oder interaktive Befehle, in denen häufig die Reproduktionsschritte stecken.',
  'It resolves the target name through DNS and then connects to the returned address.':
    'Es löst den Zielnamen über DNS auf und verbindet sich dann mit der zurückgegebenen Adresse.',
  'It routes by URL path and hostname, terminates TLS so certificates live in one place, and can run a Web Application Firewall in front of your app.':
    'Es routet nach URL-Pfad und Hostname, terminiert TLS, sodass Zertifikate an einem Ort liegen, und kann eine Web Application Firewall vor Ihre App schalten.',
  'It separates billing, applies quota limits, and acts as a scope for role assignments and policy.':
    'Es trennt die Abrechnung, wendet Kontingentgrenzen an und dient als Bereich für Rollenzuweisungen und Richtlinien.',
  'It shares the App Service networking model — Private Endpoint for inbound, VNet integration for outbound. The hosting plan decides what is available: Flex Consumption and Premium both support VNet integration, the classic Consumption plan does not.': 'Es verwendet das Netzwerkmodell von App Service — Private Endpoint für eingehenden, VNet-Integration für ausgehenden Datenverkehr. Der Hostingplan bestimmt, was verfügbar ist: Flex Consumption und Premium unterstützen beide die VNet-Integration, der klassische Consumption-Plan nicht.',
  'It sits in the GatewaySubnet and is linked to a circuit through a connection. Route exchange is always via BGP.':
    'Es liegt im GatewaySubnet und ist über eine Verbindung mit einer Leitung verknüpft. Der Routenaustausch erfolgt immer per BGP.',
  'It steers users to the closest or highest-priority region and removes failed regions from DNS answers.':
    'Er lenkt Benutzer zur nächstgelegenen Region oder zu der mit der höchsten Priorität und entfernt ausgefallene Regionen aus den DNS-Antworten.',
  'It suits glue logic and triggers where running a full application host would be wasteful.':
    'Das eignet sich für Verbindungslogik und Trigger, bei denen ein vollständiger Anwendungshost Verschwendung wäre.',
  'It suits short-lived or bursty jobs where a full Kubernetes cluster would be overkill.':
    'Das eignet sich für kurzlebige oder stoßweise Aufgaben, für die ein vollständiger Kubernetes-Cluster überdimensioniert wäre.',
  'It suits workloads that need multi-region replication and predictable latency at scale.':
    'Das eignet sich für Workloads, die regionsübergreifende Replikation und vorhersehbare Latenz im großen Maßstab benötigen.',
  'It terminates the user connection at the nearest Microsoft edge site, which cuts latency, and it fails over between regional backends automatically.':
    'Es terminiert die Benutzerverbindung am nächstgelegenen Microsoft-Edge-Standort, was die Latenz senkt, und wechselt automatisch zwischen regionalen Back-Ends.',
  'Key Vault stores secrets, keys, and certificates with access controlled by policy or RBAC.':
    'Key Vault speichert Geheimnisse, Schlüssel und Zertifikate, wobei der Zugriff per Richtlinie oder RBAC gesteuert wird.',
  'Make sure the return path has an equivalent route, or the flow becomes asymmetric and is dropped by the stateful firewall.':
    'Stellen Sie sicher, dass der Rückweg eine gleichwertige Route hat, sonst wird der Datenfluss asymmetrisch und von der zustandsbehafteten Firewall verworfen.',
  'Management traffic often takes a completely different path from application traffic and has its own controls.':
    'Verwaltungsverkehr nimmt oft einen völlig anderen Weg als Anwendungsverkehr und unterliegt eigenen Kontrollen.',
  'Mobile clients frequently arrive over carrier networks or a Point-to-Site VPN, so their path differs from office clients.':
    'Mobile Clients kommen häufig über Mobilfunknetze oder ein Point-to-Site-VPN an, sodass sich ihr Pfad von dem der Büroclients unterscheidet.',
  'Most enterprise workloads are hybrid, so Azure resources must reach systems that still live on-premises (and vice versa).':
    'Die meisten Unternehmensworkloads sind hybrid, sodass Azure-Ressourcen Systeme erreichen müssen, die weiterhin lokal betrieben werden (und umgekehrt).',
  'NAT Gateway is zonal — confirm the zone matches the workload for zone-resilient designs.':
    'Das NAT-Gateway ist zonal — prüfen Sie bei zonenresilienten Entwürfen, ob die Zone zur Workload passt.',
  'NAT Gateway provides outbound-only internet connectivity for a subnet, using dedicated public IPs.':
    'Das NAT-Gateway bietet einem Subnetz ausschließlich ausgehende Internetkonnektivität über dedizierte öffentliche IPs.',
  'NSGs and UDRs affect a Private Endpoint only when the subnet has PrivateEndpointNetworkPolicies enabled — it is disabled by default, so a rule you expect to match may never be evaluated at all.': 'NSGs und UDRs wirken sich auf einen Private Endpoint nur aus, wenn im Subnetz PrivateEndpointNetworkPolicies aktiviert ist — standardmäßig ist es deaktiviert, sodass eine Regel, die Ihrer Erwartung nach greifen sollte, unter Umständen nie ausgewertet wird.',
  'Native client and IP-based connection require the Standard or Premium SKU.':
    'Nativer Client und IP-basierte Verbindung erfordern die SKU Standard oder Premium.',
  'Network Watcher is the diagnostics toolbox for Azure networking — connection troubleshoot, IP flow verify, next hop, packet capture, and flow logs.':
    'Network Watcher ist der Diagnosewerkzeugkasten für Azure-Netzwerke — Verbindungsproblembehandlung, IP-Flussüberprüfung, nächster Hop, Paketerfassung und Flussprotokolle.',
  'Azure CNI is the current plugin and the IP mode is what matters. In node-subnet or pod-subnet mode every pod gets a real VNet IP, so pod addresses must be planned into the subnet size; CNI Overlay instead puts pods on a separate overlay range and consumes far fewer VNet IPs. Legacy kubenet is retiring on 31 March 2028.': 'Azure CNI ist das aktuelle Plug-In, entscheidend ist der IP-Modus. Im Modus node-subnet oder pod-subnet erhält jeder Pod eine echte VNet-IP, die Pod-Adressen müssen also in die Subnetzgröße eingeplant werden; CNI Overlay legt Pods dagegen auf einen separaten Overlay-Bereich und verbraucht weit weniger VNet-IPs. Das ältere kubenet wird am 31. März 2028 eingestellt.',
  'Nothing reaches the right destination if the name resolves to the wrong address — DNS is the first hop of almost every flow.':
    'Nichts erreicht das richtige Ziel, wenn der Name zur falschen Adresse aufgelöst wird — DNS ist der erste Hop nahezu jedes Datenflusses.',
  'On-premises clients cannot query Azure Private DNS Zones directly, and Azure clients often need to resolve on-premises names. The resolver bridges both directions.':
    'Lokale Clients können private Azure-DNS-Zonen nicht direkt abfragen, und Azure-Clients müssen häufig lokale Namen auflösen. Der Resolver überbrückt beide Richtungen.',
  'One VM can have multiple NICs, and each NIC can hold multiple IP configurations. Accelerated Networking is enabled per NIC.':
    'Eine VM kann mehrere NICs haben, und jede NIC kann mehrere IP-Konfigurationen enthalten. Accelerated Networking wird je NIC aktiviert.',
  'Outbound type (load balancer, NAT Gateway, or userDefinedRouting) determines the egress path.':
    'Der Ausgangstyp (Load Balancer, NAT-Gateway oder userDefinedRouting) bestimmt den Ausgangspfad.',
  'Over Private Link, confirm the privatelink.vaultcore.azure.net zone is linked to the VNet.':
    'Prüfen Sie bei Private Link, ob die Zone privatelink.vaultcore.azure.net mit dem VNet verknüpft ist.',
  'Over Private Link, verify the name resolves to the private IP.':
    'Prüfen Sie bei Private Link, ob der Name zur privaten IP aufgelöst wird.',
  'Portal actions call Azure Resource Manager over HTTPS; they do not traverse your VNet.':
    'Portalaktionen rufen Azure Resource Manager über HTTPS auf; sie durchqueren Ihr VNet nicht.',
  'Private Endpoint requires a DNS record for every region the account is replicated to.':
    'Der private Endpunkt benötigt einen DNS-Eintrag für jede Region, in die das Konto repliziert wird.',
  'Private Link Service publishes your own service, sitting behind a Standard internal load balancer, so other VNets can consume it via a Private Endpoint.':
    'Private Link Service veröffentlicht Ihren eigenen Dienst hinter einem internen Standard-Lastenausgleich, sodass andere VNets ihn über einen privaten Endpunkt nutzen können.',
  'Public-facing workloads must be reachable from the internet, and most workloads need outbound internet access for updates and API calls.':
    'Öffentlich zugängliche Workloads müssen aus dem Internet erreichbar sein, und die meisten Workloads benötigen ausgehenden Internetzugriff für Updates und API-Aufrufe.',
  'Real environments contain third-party appliances, SaaS endpoints, and legacy systems that still shape the traffic path.':
    'Reale Umgebungen enthalten Appliances von Drittanbietern, SaaS-Endpunkte und Altsysteme, die den Verkehrsweg weiterhin prägen.',
  'Redirect policy requires 11000-11999 outbound to be open — this is a very common firewall oversight.':
    'Die Redirect-Richtlinie erfordert, dass ausgehend die Ports 11000-11999 offen sind — ein sehr häufiges Firewallversäumnis.',
  'Region choice controls latency to your users, data-residency compliance, and which services and SKUs are even available.':
    'Die Regionswahl bestimmt die Latenz zu Ihren Benutzern, die Einhaltung von Datenresidenzvorgaben und sogar, welche Dienste und SKUs verfügbar sind.',
  'Remember inbound is evaluated subnet-first then NIC; outbound is NIC-first then subnet.':
    'Denken Sie daran: Eingehend wird zuerst das Subnetz, dann die NIC ausgewertet; ausgehend zuerst die NIC, dann das Subnetz.',
  'Resource group membership never blocks traffic — if something is unreachable, look at NSG, UDR, DNS, or peering instead.':
    'Die Zugehörigkeit zu einer Ressourcengruppe blockiert niemals Verkehr — ist etwas nicht erreichbar, prüfen Sie stattdessen NSG, UDR, DNS oder Peering.',
  'Resources are placed in subnets inside the VNet. Everything in the same VNet can reach everything else by default; reaching another VNet requires peering, a gateway, or Private Link.':
    'Ressourcen werden in Subnetzen innerhalb des VNets platziert. Standardmäßig kann alles im selben VNet alles andere erreichen; ein anderes VNet zu erreichen erfordert Peering, ein Gateway oder Private Link.',
  'Resources in different subscriptions can still be peered and connected, but quota, policy, and RBAC are evaluated per subscription.':
    'Ressourcen in verschiedenen Abonnements können dennoch gepeert und verbunden werden, doch Kontingent, Richtlinien und RBAC werden je Abonnement ausgewertet.',
  'Rule collection groups are evaluated by priority, and inherited parent rules always run before child rules.':
    'Regelsammlungsgruppen werden nach Priorität ausgewertet, und geerbte übergeordnete Regeln laufen immer vor untergeordneten Regeln.',
  'Run IP flow verify for the failing 5-tuple — it names the deciding rule directly.':
    'Führen Sie die IP-Flussüberprüfung für das fehlschlagende 5-Tupel aus — sie nennt die entscheidende Regel direkt.',
  'Run next hop from the source NIC to confirm the routing decision.':
    'Führen Sie „Nächster Hop“ von der Quell-NIC aus, um die Routingentscheidung zu bestätigen.',
  'Secured hub (Routing Intent) changes the path — confirm whether traffic is being sent to Azure Firewall.':
    'Ein gesicherter Hub (Routingabsicht) verändert den Pfad — prüfen Sie, ob der Verkehr an Azure Firewall gesendet wird.',
  'Service tags change over time; prefer them over hard-coded IP ranges.':
    'Diensttags ändern sich im Laufe der Zeit; bevorzugen Sie sie gegenüber fest codierten IP-Bereichen.',
  'Standard SKU addresses are static and secure-by-default — inbound is denied unless an NSG allows it. Basic SKU is retired.':
    'Adressen der Standard-SKU sind statisch und standardmäßig sicher — eingehender Verkehr wird verweigert, sofern keine NSG ihn zulässt. Die Basic-SKU ist eingestellt.',
  'Subnets let you segment a VNet so different tiers (web, app, data) can be secured and routed independently.':
    'Subnetze ermöglichen es, ein VNet zu segmentieren, sodass verschiedene Ebenen (Web, App, Daten) unabhängig abgesichert und geroutet werden können.',
  'Test on and off the corporate network — a split-tunnel VPN policy often explains "works for some users".':
    'Testen Sie innerhalb und außerhalb des Unternehmensnetzwerks — eine Split-Tunnel-VPN-Richtlinie erklärt häufig „funktioniert bei manchen Benutzern“.',
  'The ALB controller in the cluster watches Kubernetes objects and programs the gateway, forwarding HTTP/HTTPS traffic straight to pod endpoints.':
    'Der ALB-Controller im Cluster überwacht Kubernetes-Objekte und konfiguriert das Gateway, das HTTP/HTTPS-Verkehr direkt an Podendpunkte weiterleitet.',
  'The Azure portal — the browser-based management plane at portal.azure.com.':
    'Das Azure-Portal — die browserbasierte Verwaltungsebene unter portal.azure.com.',
  'The NAT subnet must have enough free IP addresses for the number of connections.':
    'Das NAT-Subnetz muss genügend freie IP-Adressen für die Anzahl der Verbindungen bieten.',
  'The SDK can use direct mode, which opens additional TCP ports beyond 443, or gateway mode which uses 443 only.':
    'Das SDK kann den Direktmodus nutzen, der zusätzliche TCP-Ports über 443 hinaus öffnet, oder den Gatewaymodus, der nur 443 verwendet.',
  'The backend must be behind a Standard SKU internal load balancer — Basic is not supported.':
    'Das Back-End muss hinter einem internen Lastenausgleich der Standard-SKU liegen — Basic wird nicht unterstützt.',
  'The circuit carries one or more peerings. Private peering reaches your VNets; Microsoft peering reaches Microsoft public services such as Microsoft 365.':
    'Die Leitung trägt ein oder mehrere Peerings. Privates Peering erreicht Ihre VNets; Microsoft-Peering erreicht öffentliche Microsoft-Dienste wie Microsoft 365.',
  'The client resolves a name through DNS, then connects to whatever public or private IP that name returns.':
    'Der Client löst einen Namen über DNS auf und verbindet sich dann mit der öffentlichen oder privaten IP, die dieser Name zurückgibt.',
  'The end user or client device that starts the request.':
    'Der Endbenutzer oder das Clientgerät, das die Anforderung auslöst.',
  'The function needs reachable storage; a blocked storage account stops the function starting at all.':
    'Die Funktion benötigt erreichbaren Speicher; ein blockiertes Speicherkonto verhindert den Start der Funktion vollständig.',
  'The gateway alone does nothing; the connection is what actually establishes and holds the tunnel or circuit link.':
    'Das Gateway allein bewirkt nichts; erst die Verbindung baut den Tunnel bzw. die Leitungsanbindung tatsächlich auf und hält sie.',
  'The guest OS firewall is a separate layer from the NSG — Windows Firewall or iptables can block traffic the NSG allowed.':
    'Die Firewall des Gastbetriebssystems ist eine von der NSG getrennte Schicht — Windows-Firewall oder iptables können Verkehr blockieren, den die NSG zugelassen hat.',
  'The plan is associated with a VNet, and every public IP in that VNet is then protected.':
    'Der Plan wird einem VNet zugeordnet, und jede öffentliche IP in diesem VNet ist dann geschützt.',
  'The public internet — traffic arriving from, or leaving to, addresses outside your network.':
    'Das öffentliche Internet — Verkehr, der von Adressen außerhalb Ihres Netzwerks kommt oder dorthin geht.',
  'The subnet must be named exactly AzureBastionSubnet and be /26 or larger.':
    'Das Subnetz muss exakt AzureBastionSubnet heißen und /26 oder größer sein.',
  'The target VM NSG must allow inbound 3389/22 FROM the Bastion subnet.':
    'Die NSG der Ziel-VM muss eingehend 3389/22 AUS dem Bastion-Subnetz zulassen.',
  'The user resolves your hostname to the closest edge POP. The edge applies WAF and caching rules, then forwards over the Microsoft backbone to the healthiest origin.':
    'Der Benutzer löst Ihren Hostnamen zum nächstgelegenen Edge-POP auf. Die Edge wendet WAF- und Cachingregeln an und leitet dann über den Microsoft-Backbone an den gesündesten Ursprung weiter.',
  'This represents the customer network outside Azure — a corporate datacenter, branch office, or another cloud.':
    'Dies steht für das Kundennetzwerk außerhalb von Azure — ein Unternehmensrechenzentrum, eine Zweigstelle oder eine andere Cloud.',
  'Traffic Manager is DNS-based global load balancing — it answers DNS queries with the endpoint you should use.':
    'Traffic Manager ist ein DNS-basierter globaler Lastenausgleich — er beantwortet DNS-Abfragen mit dem Endpunkt, den Sie verwenden sollten.',
  'Traffic is steered to it with a UDR. For high availability it sits behind an internal load balancer, and its NIC must have IP forwarding enabled.':
    'Der Verkehr wird mit einer UDR dorthin gelenkt. Für Hochverfügbarkeit steht sie hinter einem internen Lastenausgleich, und auf ihrer NIC muss die IP-Weiterleitung aktiviert sein.',
  'Traffic is steered to it with a User-Defined Route pointing at its private IP. Rules are evaluated in order: DNAT, then network rules, then application rules.':
    'Der Verkehr wird über eine benutzerdefinierte Route, die auf ihre private IP zeigt, dorthin gelenkt. Regeln werden in dieser Reihenfolge ausgewertet: DNAT, dann Netzwerkregeln, dann Anwendungsregeln.',
  'Treat it like any other hop: confirm what it listens on, what it forwards to, and who controls its rules.':
    'Behandeln Sie es wie jeden anderen Hop: Klären Sie, worauf es lauscht, wohin es weiterleitet und wer seine Regeln kontrolliert.',
  'Use Effective security rules on the NIC — that shows the merged subnet + NIC result, which is what actually applies.':
    'Verwenden Sie „Wirksame Sicherheitsregeln“ auf der NIC — das zeigt das zusammengeführte Ergebnis aus Subnetz und NIC, also das, was tatsächlich gilt.',
  'Use effective routes on a workload NIC to prove the on-premises prefixes really arrived.':
    'Nutzen Sie die wirksamen Routen auf einer Workload-NIC, um nachzuweisen, dass die lokalen Präfixe wirklich angekommen sind.',
  'Used as a generic actor when the exact device does not matter.':
    'Wird als generischer Akteur verwendet, wenn das genaue Gerät keine Rolle spielt.',
  'VNet connections, VPN sites, and ExpressRoute circuits attach to the hub, and hub route tables control who can reach whom.':
    'VNet-Verbindungen, VPN-Standorte und ExpressRoute-Leitungen werden an den Hub angebunden, und die Routingtabellen des Hubs steuern, wer wen erreichen kann.',
  'VNet-deployed container groups need a delegated subnet.':
    'In einem VNet bereitgestellte Containergruppen benötigen ein delegiertes Subnetz.',
  'VNet-injected APIM requires specific inbound NSG rules; missing them makes the service unhealthy.':
    'In ein VNet eingebundenes APIM erfordert bestimmte eingehende NSG-Regeln; fehlen sie, wird der Dienst fehlerhaft.',
  'Verify the SKU supports the tunnel count and throughput you need.':
    'Prüfen Sie, ob die SKU die benötigte Tunnelanzahl und den benötigten Durchsatz unterstützt.',
  'Verify the VNet address space does not overlap with any peered VNet or the on-premises network.':
    'Prüfen Sie, ob sich der VNet-Adressraum nicht mit einem gepeerten VNet oder dem lokalen Netzwerk überschneidet.',
  'Verify the downstream party has allow-listed the whole prefix, not one address from it.':
    'Prüfen Sie, ob die Gegenstelle das gesamte Präfix freigegeben hat und nicht nur eine einzelne Adresse daraus.',
  'Verify the target on-premises DNS server actually answers queries from the Azure source range.':
    'Prüfen Sie, ob der lokale Ziel-DNS-Server Abfragen aus dem Azure-Quellbereich tatsächlich beantwortet.',
  'Verify you have not hit a subscription-level quota (public IPs, VNet peerings, gateway count).':
    'Prüfen Sie, ob Sie kein Kontingent auf Abonnementebene erreicht haben (öffentliche IPs, VNet-Peerings, Anzahl der Gateways).',
  'Virtual WAN is a managed networking service that provides a global transit hub-and-spoke backbone.':
    'Virtual WAN ist ein verwalteter Netzwerkdienst, der einen globalen Transit-Backbone nach dem Hub-and-Spoke-Prinzip bereitstellt.',
  'Watch for overlapping address space between on-premises and the Azure VNet — that breaks routing.':
    'Achten Sie auf überlappenden Adressraum zwischen lokaler Umgebung und Azure-VNet — das zerstört das Routing.',
  'You assign NICs to the ASG, then reference the ASG as the source or destination in NSG rules.':
    'Sie weisen der ASG NICs zu und verweisen dann in NSG-Regeln als Quelle oder Ziel auf die ASG.',
  'You create hubs per region and connect VNets, branches (VPN), and ExpressRoute circuits to them. Microsoft handles the any-to-any routing between hubs.':
    'Sie erstellen Hubs je Region und verbinden VNets, Zweigstellen (VPN) und ExpressRoute-Leitungen damit. Microsoft übernimmt das Any-to-Any-Routing zwischen den Hubs.',
  'You need it whenever traffic must take a path Azure would not choose on its own — for example forcing all egress through a firewall or NVA.':
    'Sie benötigen sie immer dann, wenn Verkehr einen Weg nehmen muss, den Azure von sich aus nicht wählen würde — etwa um den gesamten Ausgang durch eine Firewall oder NVA zu zwingen.',
  'Zone-redundant vs zonal matters for availability during a zone outage.':
    'Zonenredundant gegenüber zonal ist für die Verfügbarkeit bei einem Zonenausfall entscheidend.',
};

const ko: Dict = {
  'A 0.0.0.0/0 route with next hop None or a stale appliance IP blackholes all outbound traffic.':
    '다음 홉이 None이거나 오래된 어플라이언스 IP인 0.0.0.0/0 경로는 모든 아웃바운드 트래픽을 블랙홀로 보냅니다.',
  'A 403 is authorisation (RBAC or access policy); a connection timeout is network.':
    '403은 권한 문제(RBAC 또는 액세스 정책)이고, 연결 시간 초과는 네트워크 문제입니다.',
  'A 403 usually means authorisation or firewall; a name-resolution failure means DNS.':
    '403은 보통 권한 또는 방화벽 문제를 의미하고, 이름 확인 실패는 DNS 문제를 의미합니다.',
  'A Connection is the resource that pairs an Azure gateway with the remote side — a Local Network Gateway, another VNet gateway, or an ExpressRoute circuit.':
    '연결은 Azure 게이트웨이를 원격 측(로컬 네트워크 게이트웨이, 다른 VNet 게이트웨이 또는 ExpressRoute 회로)과 짝지어 주는 리소스입니다.',
  'A DDoS Protection plan adds always-on traffic monitoring and adaptive mitigation for public IPs in protected VNets.':
    'DDoS Protection 계획은 보호된 VNet의 공용 IP에 대해 상시 트래픽 모니터링과 적응형 완화 기능을 추가합니다.',
  'A DNS zone holds the records that translate names into IP addresses. A Private DNS Zone is only visible to VNets that are linked to it.':
    'DNS 영역은 이름을 IP 주소로 변환하는 레코드를 보관합니다. 프라이빗 DNS 영역은 연결된 VNet에서만 볼 수 있습니다.',
  'A Function App runs small pieces of event-driven code, billed by execution.':
    'Function App은 이벤트 기반의 작은 코드 조각을 실행하며 실행 횟수에 따라 과금됩니다.',
  'A Local Network Gateway is the Azure object that describes your on-premises VPN device — its public IP and the prefixes behind it.':
    '로컬 네트워크 게이트웨이는 온-프레미스 VPN 장치, 즉 그 공용 IP와 뒤에 있는 접두사를 설명하는 Azure 개체입니다.',
  'A NIC is the virtual network adapter that attaches a VM to a subnet and holds its private IP.':
    'NIC는 VM을 서브넷에 연결하고 개인 IP를 보유하는 가상 네트워크 어댑터입니다.',
  'A Private DNS Zone is linked to one or more VNets. With auto-registration enabled, VMs in a linked VNet register their own records.':
    '프라이빗 DNS 영역은 하나 이상의 VNet에 연결됩니다. 자동 등록을 사용하면 연결된 VNet의 VM이 자체 레코드를 등록합니다.',
  'A Private Endpoint is a NIC in your subnet that holds a private IP mapped to a specific PaaS resource.':
    '프라이빗 엔드포인트는 특정 PaaS 리소스에 매핑된 개인 IP를 보유한, 사용자 서브넷 내의 NIC입니다.',
  'A Public IP Prefix is a contiguous block of public addresses reserved for your subscription.':
    '공용 IP 접두사는 구독을 위해 예약된 연속된 공용 주소 블록입니다.',
  'A Public IP is an internet-routable address assigned to a gateway, load balancer, firewall, or VM NIC.':
    '공용 IP는 게이트웨이, 부하 분산 장치, 방화벽 또는 VM NIC에 할당되는 인터넷 라우팅 가능 주소입니다.',
  'A Scale Set manages an identical group of VMs that grows and shrinks automatically.':
    '확장 집합은 자동으로 늘어나고 줄어드는 동일한 VM 그룹을 관리합니다.',
  'A Storage Account holds blobs, files, queues, and tables behind a public hostname per service.':
    '스토리지 계정은 서비스별 공용 호스트 이름 뒤에서 Blob, 파일, 큐, 테이블을 보관합니다.',
  'A VPN Gateway terminates encrypted IPsec/IKE tunnels between Azure and an on-premises device or remote user.':
    'VPN 게이트웨이는 Azure와 온-프레미스 장치 또는 원격 사용자 사이의 암호화된 IPsec/IKE 터널을 종료합니다.',
  'A Virtual Machine is a server you run in Azure, with its own operating system and applications.':
    '가상 머신은 자체 운영 체제와 애플리케이션을 갖추고 Azure에서 실행하는 서버입니다.',
  'A Virtual Network is your private, isolated network in Azure, defined by one or more address ranges (CIDR blocks).':
    '가상 네트워크는 하나 이상의 주소 범위(CIDR 블록)로 정의되는, Azure 내의 격리된 개인 네트워크입니다.',
  'A Virtual WAN hub is the Microsoft-managed regional hub VNet that spokes and branches connect into.':
    'Virtual WAN 허브는 스포크와 지점이 연결되는, Microsoft가 관리하는 지역 허브 VNet입니다.',
  'A WAF policy is the rule set that inspects HTTP requests for common web attacks such as SQL injection and cross-site scripting.':
    'WAF 정책은 SQL 삽입, 크로스 사이트 스크립팅 같은 일반적인 웹 공격을 찾기 위해 HTTP 요청을 검사하는 규칙 집합입니다.',
  'A client application or device making the request.':
    '요청을 보내는 클라이언트 애플리케이션 또는 장치입니다.',
  'A command-line session such as PowerShell, Bash, or Azure CLI.':
    'PowerShell, Bash, Azure CLI와 같은 명령줄 세션입니다.',
  'A custom element added to represent something outside the standard Azure resource set.':
    '표준 Azure 리소스 집합 밖의 대상을 표현하기 위해 추가한 사용자 지정 요소입니다.',
  'A legitimate request being blocked shows up as a 403 — check the WAF logs for the triggering rule ID and add an exclusion.':
    '정상 요청이 차단되면 403으로 나타납니다. WAF 로그에서 트리거된 규칙 ID를 확인하고 제외 항목을 추가하세요.',
  'A listener accepts the request on the front-end IP, a rule matches it, and the request is forwarded to a backend pool member that the health probe reports as healthy.':
    '수신기가 프런트엔드 IP에서 요청을 수락하고, 규칙이 일치하면 상태 프로브가 정상으로 보고한 백엔드 풀 구성원으로 요청이 전달됩니다.',
  'A load-balancing rule maps a front-end IP and port to a backend pool and port. It does not inspect or modify the payload, so it cannot route by URL.':
    '부하 분산 규칙은 프런트엔드 IP와 포트를 백엔드 풀과 포트에 매핑합니다. 페이로드를 검사하거나 수정하지 않으므로 URL 기반 라우팅은 할 수 없습니다.',
  'A missing or wrong prefix here is the single most common cause of "the tunnel is up but traffic does not pass".':
    '여기에 접두사가 없거나 잘못된 것이 "터널은 연결되었지만 트래픽이 지나가지 않는다"는 현상의 가장 흔한 원인입니다.',
  'A mobile device acting as the client.':
    '클라이언트 역할을 하는 모바일 장치입니다.',
  'A person or role involved in the flow.':
    '흐름에 관여하는 사람 또는 역할입니다.',
  'A portal error is control plane (ARM, RBAC, policy) — it is not evidence of a data-path problem.':
    '포털 오류는 제어 평면(ARM, RBAC, 정책) 문제이며 데이터 경로 문제의 근거가 아닙니다.',
  'A resource group is a logical container that holds related Azure resources.':
    '리소스 그룹은 관련된 Azure 리소스를 담는 논리적 컨테이너입니다.',
  'A resource group is a management construct only — it does not affect network reachability. Two resources in different resource groups talk to each other normally.':
    '리소스 그룹은 관리용 구성 요소일 뿐이며 네트워크 도달성에 영향을 주지 않습니다. 서로 다른 리소스 그룹의 두 리소스도 정상적으로 통신합니다.',
  'A route table holds User-Defined Routes that override the routes Azure creates by default.':
    '경로 테이블은 Azure가 기본으로 만드는 경로를 재정의하는 사용자 정의 경로를 보관합니다.',
  'A server — typically an on-premises or third-party host outside Azure.':
    '서버로, 일반적으로 Azure 외부의 온-프레미스 또는 타사 호스트입니다.',
  'A subnet is a slice of the VNet address space where resources actually get their IP addresses.':
    '서브넷은 리소스가 실제로 IP 주소를 받는 VNet 주소 공간의 일부입니다.',
  'A subscription is the billing and quota boundary that resources are created in.':
    '구독은 리소스가 만들어지는 청구 및 할당량 경계입니다.',
  'A user laptop or workstation.':
    '사용자 노트북 또는 워크스테이션입니다.',
  'AKS is managed Kubernetes — Azure runs the control plane and you run workloads in node pools.':
    'AKS는 관리형 Kubernetes로, Azure가 제어 평면을 운영하고 사용자는 노드 풀에서 워크로드를 실행합니다.',
  'API Management is a gateway that publishes, secures, and throttles APIs.':
    'API Management는 API를 게시하고 보호하며 제한하는 게이트웨이입니다.',
  'Access can be restricted with the firewall and virtual network rules, or made fully private with a Private Endpoint per sub-resource (blob, file, and so on).':
    '방화벽 및 가상 네트워크 규칙으로 액세스를 제한하거나, 하위 리소스(blob, file 등)별 프라이빗 엔드포인트로 완전히 비공개로 만들 수 있습니다.',
  'Admins usually reach resources through the Azure portal, Bastion, or a jump host rather than the application front door.':
    '관리자는 보통 애플리케이션 정문이 아니라 Azure Portal, Bastion 또는 점프 호스트를 통해 리소스에 접근합니다.',
  'An ASG is a label you attach to NICs so NSG rules can target a workload role instead of IP addresses.':
    'ASG는 NSG 규칙이 IP 주소 대신 워크로드 역할을 대상으로 삼을 수 있도록 NIC에 붙이는 레이블입니다.',
  'An Azure region is a set of datacenters in one geography that hosts your resources.':
    'Azure 지역은 리소스를 호스팅하는 한 지리적 영역 내 데이터 센터의 집합입니다.',
  'An ExpressRoute Gateway is the VNet-side endpoint that attaches a VNet to an ExpressRoute circuit.':
    'ExpressRoute 게이트웨이는 VNet을 ExpressRoute 회로에 연결하는 VNet 측 엔드포인트입니다.',
  'An ExpressRoute circuit is a private Layer-3 connection between your network and Microsoft, provided by a connectivity partner.':
    'ExpressRoute 회로는 연결 파트너가 제공하는, 사용자 네트워크와 Microsoft 간의 사설 계층 3 연결입니다.',
  'An INBOUND endpoint gives on-premises an IP in Azure to forward queries to. An OUTBOUND endpoint plus a forwarding ruleset sends Azure queries for specific domains to on-premises DNS servers.':
    '인바운드 엔드포인트는 온-프레미스가 쿼리를 전달할 수 있는 Azure 내 IP를 제공합니다. 아웃바운드 엔드포인트와 전달 규칙 집합은 특정 도메인에 대한 Azure 쿼리를 온-프레미스 DNS 서버로 보냅니다.',
  'An IP Group is a named, reusable collection of IP addresses and ranges.':
    'IP 그룹은 이름이 지정된 재사용 가능한 IP 주소 및 범위 모음입니다.',
  'An NSG and a route table are attached at the subnet level, so every resource in the subnet inherits those rules. Some services require a dedicated, specially-named subnet (for example GatewaySubnet, AzureFirewallSubnet, AzureBastionSubnet).':
    'NSG와 경로 테이블은 서브넷 수준에 연결되므로 서브넷 내 모든 리소스가 해당 규칙을 상속합니다. 일부 서비스는 전용의 특정 이름을 가진 서브넷(예: GatewaySubnet, AzureFirewallSubnet, AzureBastionSubnet)을 요구합니다.',
  'An NSG is a stateful packet filter with allow and deny rules based on source, destination, port, and protocol.':
    'NSG는 원본, 대상, 포트, 프로토콜을 기준으로 허용 및 거부 규칙을 적용하는 상태 저장 패킷 필터입니다.',
  'An NVA is a third-party firewall, router, or proxy running as a VM inside your VNet.':
    'NVA는 VNet 내부에서 VM으로 실행되는 타사 방화벽, 라우터 또는 프록시입니다.',
  'An administrator performing management or troubleshooting work.':
    '관리 또는 문제 해결 작업을 수행하는 관리자입니다.',
  'An image pull failure over Private Link is nearly always DNS — verify the registry name resolves to the private IP.':
    'Private Link를 통한 이미지 풀 실패는 거의 항상 DNS 문제입니다. 레지스트리 이름이 개인 IP로 확인되는지 확인하세요.',
  'App Service is a managed platform for hosting web apps and APIs without managing servers.':
    'App Service는 서버를 관리하지 않고 웹앱과 API를 호스팅하는 관리형 플랫폼입니다.',
  'Application Gateway for Containers is the Kubernetes-native Layer-7 ingress built on the Application Gateway platform.':
    'Application Gateway for Containers는 Application Gateway 플랫폼 위에 구축된 Kubernetes 네이티브 계층 7 수신입니다.',
  'Application Gateway is a regional Layer-7 (HTTP/HTTPS) load balancer.':
    'Application Gateway는 지역 단위 계층 7(HTTP/HTTPS) 부하 분산 장치입니다.',
  'Application rules need the FQDN; if the client resolves DNS differently, the rule will not match.':
    '애플리케이션 규칙에는 FQDN이 필요합니다. 클라이언트가 DNS를 다르게 확인하면 규칙이 일치하지 않습니다.',
  'Asymmetric routing is a classic failure — the return path must also traverse the firewall.':
    '비대칭 라우팅은 전형적인 실패 원인입니다. 반환 경로도 방화벽을 통과해야 합니다.',
  'Azure Bastion is a managed jump host that gives browser-based RDP and SSH access to VMs.':
    'Azure Bastion은 브라우저 기반 RDP 및 SSH로 VM에 접근하게 해 주는 관리형 점프 호스트입니다.',
  'Azure Container Registry stores and serves your container images.':
    'Azure Container Registry는 컨테이너 이미지를 저장하고 제공합니다.',
  'Azure Firewall is a managed, stateful network firewall that inspects traffic against DNAT, network, and application rules.':
    'Azure Firewall은 DNAT, 네트워크, 애플리케이션 규칙에 따라 트래픽을 검사하는 관리형 상태 저장 네트워크 방화벽입니다.',
  'Azure Firewall rules reference the IP Group by name in the source or destination field.':
    'Azure Firewall 규칙은 원본 또는 대상 필드에서 IP 그룹을 이름으로 참조합니다.',
  'Azure Load Balancer is a Layer-4 (TCP/UDP) load balancer that spreads connections across a backend pool.':
    'Azure Load Balancer는 백엔드 풀 전체에 연결을 분산하는 계층 4(TCP/UDP) 부하 분산 장치입니다.',
  'Azure SQL Database is a managed relational database service.':
    'Azure SQL Database는 관리형 관계형 데이터베이스 서비스입니다.',
  'Azure needs to know which address ranges live on the far side of the tunnel so it can route to them.':
    'Azure가 터널 반대편의 주소 범위로 라우팅하려면 그 범위를 알아야 합니다.',
  'Azure protects its platform by default, but a Network Protection plan tunes mitigation to YOUR traffic and adds attack telemetry plus cost protection.':
    'Azure는 기본적으로 플랫폼을 보호하지만, 네트워크 보호 계획은 사용자의 트래픽에 맞춰 완화를 조정하고 공격 원격 분석과 비용 보호를 추가합니다.',
  'Because it is DNS-based, client-side DNS caching and TTL delay failover — check the TTL.':
    'DNS 기반이므로 클라이언트 측 DNS 캐싱과 TTL이 장애 조치를 지연시킵니다. TTL을 확인하세요.',
  'Both the source and destination ASG must be in the SAME virtual network for a rule to work.':
    '규칙이 동작하려면 원본과 대상 ASG가 동일한 가상 네트워크에 있어야 합니다.',
  'Caching can mask a backend change — purge before concluding the backend is wrong.':
    '캐싱이 백엔드 변경을 가릴 수 있습니다. 백엔드가 잘못됐다고 결론짓기 전에 캐시를 제거하세요.',
  'Capture the exact command and full error text — it usually names the failing endpoint and port.':
    '정확한 명령과 전체 오류 텍스트를 수집하세요. 대개 실패한 엔드포인트와 포트가 명시되어 있습니다.',
  'Check BGP session state and the advertised/received route counts on each peering.':
    '각 피어링에서 BGP 세션 상태와 광고/수신 경로 수를 확인하세요.',
  'Check DDoS mitigation metrics before assuming an outage is application-side.':
    '장애가 애플리케이션 측 문제라고 단정하기 전에 DDoS 완화 메트릭을 확인하세요.',
  'Check SNAT port utilisation metrics if outbound connections start failing intermittently.':
    '아웃바운드 연결이 간헐적으로 실패하기 시작하면 SNAT 포트 사용률 메트릭을 확인하세요.',
  'Check backend health first — an unhealthy pool returns 502.':
    '먼저 백엔드 상태를 확인하세요. 비정상 풀은 502를 반환합니다.',
  'Check connection status and the ingress/egress byte counters — zero bytes with a Connected state points at routing, not the tunnel.':
    '연결 상태와 수신/송신 바이트 카운터를 확인하세요. 상태가 연결됨인데 바이트가 0이면 터널이 아니라 라우팅 문제입니다.',
  'Check container logs and restart count first — an app crash looks like a network failure from outside.':
    '먼저 컨테이너 로그와 다시 시작 횟수를 확인하세요. 앱 충돌은 외부에서 보면 네트워크 장애처럼 보입니다.',
  'Check effective routes and effective security rules on the NIC.':
    'NIC에서 유효 경로와 유효 보안 규칙을 확인하세요.',
  'Check effective routes on a NIC in this VNet to see what next hop Azure is actually using.':
    '이 VNet의 NIC에서 유효 경로를 확인하여 Azure가 실제로 사용하는 다음 홉을 확인하세요.',
  'Check effective routes on the NIC — that is the ground truth, not the route table definition.':
    'NIC에서 유효 경로를 확인하세요. 경로 테이블 정의가 아니라 그것이 실제 사실입니다.',
  'Check endpoint monitor status; an endpoint marked Degraded is removed from responses.':
    '엔드포인트 모니터 상태를 확인하세요. 성능 저하로 표시된 엔드포인트는 응답에서 제외됩니다.',
  'Check for a delete lock or Azure Policy assignment at this scope if a deployment is failing.':
    '배포가 실패하면 이 범위에 삭제 잠금이나 Azure Policy 할당이 있는지 확인하세요.',
  'Check for asymmetric routing — both directions must traverse the same appliance instance.':
    '비대칭 라우팅을 확인하세요. 양방향 모두 동일한 어플라이언스 인스턴스를 통과해야 합니다.',
  'Check health probe status — if every instance is unhealthy the load balancer silently drops traffic.':
    '상태 프로브 상태를 확인하세요. 모든 인스턴스가 비정상이면 부하 분산 장치는 조용히 트래픽을 버립니다.',
  'Check hub routing status and the effective routes for the connection in question.':
    '허브 라우팅 상태와 해당 연결의 유효 경로를 확인하세요.',
  'Check origin health probes and the origin host header setting — a mismatch causes 4xx from the origin.':
    '원본 상태 프로브와 원본 호스트 헤더 설정을 확인하세요. 불일치하면 원본에서 4xx가 발생합니다.',
  'Check priority ordering — a broad deny in a parent policy silently overrides a child allow.':
    '우선 순위 순서를 확인하세요. 상위 정책의 광범위한 거부는 하위 정책의 허용을 조용히 무시합니다.',
  'Check that the on-premises prefixes are present in the Local Network Gateway (or advertised via BGP).':
    '온-프레미스 접두사가 로컬 네트워크 게이트웨이에 있는지(또는 BGP로 광고되는지) 확인하세요.',
  'Check that the on-premises router actually advertises the local prefixes, and that it learns the Azure address space.':
    '온-프레미스 라우터가 로컬 접두사를 실제로 광고하고 Azure 주소 공간을 학습하는지 확인하세요.',
  'Check the A record exists and points at the expected IP.':
    'A 레코드가 존재하고 예상한 IP를 가리키는지 확인하세요.',
  'Check the ALB controller pod logs in the cluster.':
    '클러스터에서 ALB 컨트롤러 파드 로그를 확인하세요.',
  'Check the NSG attached to this subnet — subnet rules are evaluated before NIC rules for inbound traffic.':
    '이 서브넷에 연결된 NSG를 확인하세요. 인바운드 트래픽에서는 서브넷 규칙이 NIC 규칙보다 먼저 평가됩니다.',
  'Check the connection state is Approved, not Pending.':
    '연결 상태가 보류 중이 아니라 승인됨인지 확인하세요.',
  'Check the default rules — DenyAllInbound at priority 65500 catches anything you did not explicitly allow.':
    '기본 규칙을 확인하세요. 우선 순위 65500의 DenyAllInbound가 명시적으로 허용하지 않은 모든 것을 차단합니다.',
  'Check the effective routes on the hub route table, not just on the spoke.':
    '스포크뿐 아니라 허브 경로 테이블의 유효 경로도 확인하세요.',
  'Check the firewall logs for the specific flow — they tell you which rule allowed or denied it.':
    '해당 흐름에 대한 방화벽 로그를 확인하세요. 어떤 규칙이 허용 또는 거부했는지 알려 줍니다.',
  'Check the forwarding ruleset is linked to the VNet, and that the rule domain name ends with a trailing dot.':
    '전달 규칙 집합이 VNet에 연결되어 있는지, 규칙 도메인 이름이 마침표로 끝나는지 확인하세요.',
  'Check the number of routes learned — exceeding the route limit drops the BGP session.':
    '학습된 경로 수를 확인하세요. 경로 한도를 초과하면 BGP 세션이 끊깁니다.',
  'Check the policy trace for the failing call — the answer is usually a policy, not the network.':
    '실패한 호출의 정책 추적을 확인하세요. 원인은 보통 네트워크가 아니라 정책입니다.',
  'Check the route on the server itself — it must know to send the Azure prefixes to the tunnel.':
    '서버 자체의 경로를 확인하세요. Azure 접두사를 터널로 보내야 한다는 것을 알고 있어야 합니다.',
  'Check the route table attached to this subnet for a UDR that overrides the default system route.':
    '이 서브넷에 연결된 경로 테이블에 기본 시스템 경로를 재정의하는 UDR이 있는지 확인하세요.',
  'Check the service is actually available in this region (some SKUs are region-limited).':
    '해당 서비스가 이 지역에서 실제로 제공되는지 확인하세요(일부 SKU는 지역이 제한됩니다).',
  'Check the service type — ClusterIP is cluster-internal only, LoadBalancer creates an Azure load balancer.':
    '서비스 유형을 확인하세요. ClusterIP는 클러스터 내부 전용이고, LoadBalancer는 Azure 부하 분산 장치를 만듭니다.',
  'Check what the client resolves the name to, and from which network it is connecting.':
    '클라이언트가 이름을 무엇으로 확인하는지, 그리고 어느 네트워크에서 연결하는지 확인하세요.',
  'Check whether Access Restrictions are blocking the caller.':
    '액세스 제한이 호출자를 차단하고 있는지 확인하세요.',
  'Check whether the client is on the corporate network, on VPN, or on the public internet, because the path differs.':
    '경로가 달라지므로 클라이언트가 회사 네트워크, VPN, 공용 인터넷 중 어디에 있는지 확인하세요.',
  'Check whether unhealthy instances are being rolled — an instance can be up but failing its probe.':
    '비정상 인스턴스가 교체되고 있는지 확인하세요. 인스턴스가 실행 중이어도 프로브에 실패할 수 있습니다.',
  'Circuits are redundant by design — verify BOTH links, not just the primary.':
    '회로는 설계상 이중화되어 있습니다. 주 링크만이 아니라 두 링크 모두 확인하세요.',
  'Client-side caching can hide a fix — flush the resolver cache before retesting.':
    '클라이언트 측 캐싱이 수정 결과를 가릴 수 있습니다. 다시 테스트하기 전에 확인자 캐시를 지우세요.',
  'Compare a lookup and a connection test from the laptop against the same test run inside Azure.':
    '노트북에서의 이름 조회와 연결 테스트를 Azure 내부에서 실행한 동일한 테스트와 비교하세요.',
  'Compare the IPsec policy on this connection with the on-premises configuration line by line.':
    '이 연결의 IPsec 정책을 온-프레미스 구성과 한 줄씩 비교하세요.',
  'Compute platforms need somewhere private and close to pull images from at deployment time.':
    '컴퓨팅 플랫폼은 배포 시 이미지를 가져올, 가깝고 비공개인 위치가 필요합니다.',
  'Confirm IP forwarding is enabled if this NIC belongs to an NVA that must route traffic for others.':
    '이 NIC가 다른 트래픽을 라우팅해야 하는 NVA의 것이라면 IP 전달이 사용하도록 설정되어 있는지 확인하세요.',
  'Confirm a UDR actually forces the traffic through the firewall; without it traffic bypasses the firewall entirely.':
    'UDR이 실제로 트래픽을 방화벽으로 강제하는지 확인하세요. 없으면 트래픽은 방화벽을 완전히 우회합니다.',
  'Confirm a virtual network link exists between the zone and the client VNet — without it the zone is invisible.':
    '영역과 클라이언트 VNet 사이에 가상 네트워크 링크가 있는지 확인하세요. 없으면 영역이 보이지 않습니다.',
  'Confirm backend certificate validation settings if the backend uses a private CA.':
    '백엔드가 사설 CA를 사용한다면 백엔드 인증서 유효성 검사 설정을 확인하세요.',
  'Confirm both sides of the flow are in the region you expect — cross-region hops add latency and egress charges.':
    '흐름의 양쪽이 예상한 지역에 있는지 확인하세요. 지역 간 홉은 대기 시간과 송신 요금을 늘립니다.',
  'Confirm the NIC really is a member — an unassigned NIC silently falls through to the deny rule.':
    'NIC가 실제로 구성원인지 확인하세요. 할당되지 않은 NIC는 조용히 거부 규칙으로 넘어갑니다.',
  'Confirm the NSG on the Application Gateway subnet allows the required inbound ports from the GatewayManager service tag.':
    'Application Gateway 서브넷의 NSG가 GatewayManager 서비스 태그에서 오는 필수 인바운드 포트를 허용하는지 확인하세요.',
  'Confirm the NSG on the backend NICs or subnet allows the probe source (AzureLoadBalancer service tag) and the data port.':
    '백엔드 NIC 또는 서브넷의 NSG가 프로브 원본(AzureLoadBalancer 서비스 태그)과 데이터 포트를 허용하는지 확인하세요.',
  'Confirm the Private DNS Zone is linked to the VNet the client sits in, and that the A record exists.':
    '프라이빗 DNS 영역이 클라이언트가 있는 VNet에 연결되어 있고 A 레코드가 존재하는지 확인하세요.',
  'Confirm the UDR next hop points at the NVA private IP (or the internal load balancer front end for an HA pair).':
    'UDR의 다음 홉이 NVA 개인 IP(HA 쌍인 경우 내부 부하 분산 장치 프런트엔드)를 가리키는지 확인하세요.',
  'Confirm the VNet DNS setting (Azure-provided vs custom DNS servers) matches what the workload expects.':
    'VNet의 DNS 설정(Azure 제공 DNS 대 사용자 지정 DNS 서버)이 워크로드가 기대하는 것과 일치하는지 확인하세요.',
  'Confirm the VNet connection propagates to, and associates with, the route tables you expect.':
    'VNet 연결이 예상한 경로 테이블에 전파되고 연결되는지 확인하세요.',
  'Confirm the VNet is actually associated with the plan.':
    'VNet이 실제로 해당 계획과 연결되어 있는지 확인하세요.',
  'Confirm the address is actually associated with the resource you think it is.':
    '해당 주소가 실제로 생각하는 리소스에 연결되어 있는지 확인하세요.',
  'Confirm the address you expect is really in the group — a missing entry looks exactly like a firewall deny.':
    '예상한 주소가 실제로 그룹에 있는지 확인하세요. 항목이 없으면 방화벽 거부와 똑같이 보입니다.',
  'Confirm the admin path (Bastion, VPN, or portal) separately — it can fail while the app path works.':
    '관리 경로(Bastion, VPN 또는 포털)를 별도로 확인하세요. 앱 경로는 정상인데 관리 경로만 실패할 수 있습니다.',
  'Confirm the application is actually listening on the expected port (netstat or ss).':
    '애플리케이션이 실제로 예상한 포트에서 수신 대기 중인지 확인하세요(netstat 또는 ss).',
  'Confirm the association subnet is delegated correctly and has free addresses.':
    '연결 서브넷이 올바르게 위임되어 있고 사용 가능한 주소가 있는지 확인하세요.',
  'Confirm the circuit status is Provisioned and the peering is configured on both the provider and Microsoft side.':
    '회로 상태가 프로비저닝됨이고 피어링이 공급자 측과 Microsoft 측 모두에 구성되어 있는지 확인하세요.',
  'Confirm the consumer connection request has been approved.':
    '소비자의 연결 요청이 승인되었는지 확인하세요.',
  'Confirm the gateway SKU supports the required throughput and the number of circuit connections.':
    '게이트웨이 SKU가 필요한 처리량과 회로 연결 수를 지원하는지 확인하세요.',
  'Confirm the local firewall and any host-based firewall permit the flow in both directions.':
    '로컬 방화벽과 호스트 기반 방화벽이 양방향으로 흐름을 허용하는지 확인하세요.',
  'Confirm the on-premises conditional forwarder points at the inbound endpoint IP, and that UDP and TCP port 53 are open across the tunnel.':
    '온-프레미스 조건부 전달자가 인바운드 엔드포인트 IP를 가리키는지, 터널을 통해 UDP 및 TCP 53 포트가 열려 있는지 확인하세요.',
  'Confirm the on-premises firewall permits the required ports in BOTH directions.':
    '온-프레미스 방화벽이 필요한 포트를 양방향으로 허용하는지 확인하세요.',
  'Confirm the origin only accepts traffic from Front Door (X-Azure-FDID header or the AzureFrontDoor.Backend service tag).':
    '원본이 Front Door에서 오는 트래픽만 수락하는지 확인하세요(X-Azure-FDID 헤더 또는 AzureFrontDoor.Backend 서비스 태그).',
  'Confirm the hosting plan supports the networking feature you need — the classic Consumption plan has no VNet integration, while Flex Consumption and Premium do.': '호스팅 계획이 필요한 네트워킹 기능을 지원하는지 확인하세요. 기존 Consumption 계획에는 VNet 통합이 없지만 Flex Consumption과 Premium에는 있습니다.',
  'Confirm the policy is actually associated with the firewall handling this traffic.':
    '해당 정책이 이 트래픽을 처리하는 방화벽에 실제로 연결되어 있는지 확인하세요.',
  'Confirm the public IP matches the on-premises device address seen from the internet after NAT.':
    '공용 IP가 NAT 이후 인터넷에서 보이는 온-프레미스 장치 주소와 일치하는지 확인하세요.',
  'Confirm the pulling identity has the AcrPull role.':
    '이미지를 가져오는 ID에 AcrPull 역할이 있는지 확인하세요.',
  'Confirm the server firewall rules or Private Endpoint permit the client.':
    '서버 방화벽 규칙 또는 프라이빗 엔드포인트가 해당 클라이언트를 허용하는지 확인하세요.',
  'Confirm the subnet has enough free addresses for the maximum pods per node under Azure CNI.':
    'Azure CNI에서 노드당 최대 파드 수를 감당할 만큼 서브넷에 사용 가능한 주소가 충분한지 확인하세요.',
  'Confirm the subnet is large enough — Azure reserves 5 addresses in every subnet.':
    '서브넷이 충분히 큰지 확인하세요. Azure는 모든 서브넷에서 주소 5개를 예약합니다.',
  'Confirm the tunnel is Connected, not just Provisioned.':
    '터널이 프로비저닝됨이 아니라 연결됨 상태인지 확인하세요.',
  'Confirm the upgrade policy is not mid-rollout when investigating inconsistent behaviour.':
    '일관성 없는 동작을 조사할 때 업그레이드 정책이 롤아웃 중이 아닌지 확인하세요.',
  'Confirm what the client actually resolves the name to — a wrong DNS answer sends traffic to the wrong place.':
    '클라이언트가 실제로 이름을 무엇으로 확인하는지 확인하세요. 잘못된 DNS 응답은 트래픽을 엉뚱한 곳으로 보냅니다.',
  'Confirm whether the policy is in Detection or Prevention mode before concluding it is not the cause.':
    '정책이 원인이 아니라고 결론짓기 전에 검색 모드인지 방지 모드인지 확인하세요.',
  'Consumers create a Private Endpoint that requests a connection; you approve it. Traffic arrives with the source NAT applied by the platform.':
    '소비자가 연결을 요청하는 프라이빗 엔드포인트를 만들면 사용자가 이를 승인합니다. 트래픽은 플랫폼이 적용한 원본 NAT와 함께 도착합니다.',
  'Container Instances runs a single container without any cluster to manage.':
    'Container Instances는 관리할 클러스터 없이 단일 컨테이너를 실행합니다.',
  'Cosmos DB is a globally distributed NoSQL database with low-latency reads and writes.':
    'Cosmos DB는 짧은 대기 시간의 읽기와 쓰기를 제공하는 전역 분산 NoSQL 데이터베이스입니다.',
  'Cross-subscription peering and Private Link need permissions in BOTH subscriptions.':
    '구독 간 피어링과 Private Link에는 두 구독 모두에 대한 권한이 필요합니다.',
  'Customers use one when they need a specific vendor feature set, or want the same appliance on-premises and in Azure.':
    '고객은 특정 공급업체의 기능 집합이 필요하거나 온-프레미스와 Azure에서 동일한 어플라이언스를 쓰고 싶을 때 이를 사용합니다.',
  'DNS Private Resolver is a managed service that resolves DNS between on-premises and Azure without you running DNS server VMs.':
    'DNS Private Resolver는 DNS 서버 VM을 운영하지 않고도 온-프레미스와 Azure 사이의 DNS를 확인해 주는 관리형 서비스입니다.',
  'DNS is the number-one cause of failure — run a lookup from the client and confirm it returns the private IP, not the public one.':
    'DNS는 가장 흔한 실패 원인입니다. 클라이언트에서 조회를 실행해 공용 IP가 아닌 개인 IP가 반환되는지 확인하세요.',
  'Direct mode needs TCP 10250-10255 and 10000-20000 open; gateway mode only needs 443.':
    '직접 모드는 TCP 10250-10255 및 10000-20000이 열려 있어야 하고, 게이트웨이 모드는 443만 필요합니다.',
  'Each sub-resource needs its OWN Private Endpoint and its own privatelink DNS zone.':
    '각 하위 리소스에는 자체 프라이빗 엔드포인트와 자체 privatelink DNS 영역이 필요합니다.',
  'Effective routes and effective security rules are both read from the NIC — always start here.':
    '유효 경로와 유효 보안 규칙은 모두 NIC에서 읽습니다. 항상 여기서 시작하세요.',
  'Enable VNet flow logs for a historical record of allow and deny decisions.':
    '허용 및 거부 결정의 이력을 남기려면 VNet 흐름 로그를 사용하도록 설정하세요.',
  'Every traffic flow needs an origin — this is the person or application whose experience you are troubleshooting.':
    '모든 트래픽 흐름에는 출발점이 필요합니다. 문제를 조사 중인 대상의 사람 또는 애플리케이션이 바로 그것입니다.',
  'Everything drawn inside this boundary is deployed in the same region, so traffic between those resources stays on the regional network rather than crossing the internet.':
    '이 경계 안에 그려진 모든 것은 동일한 지역에 배포되므로, 해당 리소스 간 트래픽은 인터넷을 거치지 않고 지역 네트워크에 머무릅니다.',
  'Firewall Policy is the reusable rule container that one or more Azure Firewalls apply.':
    '방화벽 정책은 하나 이상의 Azure Firewall이 적용하는 재사용 가능한 규칙 컨테이너입니다.',
  'For Private Endpoints, the zone name must match the required pattern exactly (for example privatelink.blob.core.windows.net).':
    '프라이빗 엔드포인트의 경우 영역 이름이 요구되는 패턴과 정확히 일치해야 합니다(예: privatelink.blob.core.windows.net).',
  'For Standard SKU, remember inbound is closed by default until an NSG rule opens it.':
    'Standard SKU에서는 NSG 규칙으로 열기 전까지 인바운드가 기본적으로 닫혀 있다는 점을 기억하세요.',
  'For TLS errors, check certificate expiry, chain, and whether the backend hostname matches the certificate.':
    'TLS 오류의 경우 인증서 만료, 체인, 그리고 백엔드 호스트 이름이 인증서와 일치하는지 확인하세요.',
  'For an internal load balancer, confirm the client is on a network that can reach the private front-end IP.':
    '내부 부하 분산 장치의 경우, 클라이언트가 개인 프런트엔드 IP에 도달할 수 있는 네트워크에 있는지 확인하세요.',
  'For inbound: confirm the public IP, the NSG allow rule, and the health of the backend.':
    '인바운드의 경우: 공용 IP, NSG 허용 규칙, 백엔드 상태를 확인하세요.',
  'For outbound VNet integration, WEBSITE_DNS_SERVER and route-all settings decide whether traffic uses VNet DNS and routes.':
    '아웃바운드 VNet 통합에서는 WEBSITE_DNS_SERVER와 route-all 설정이 트래픽이 VNet DNS와 경로를 사용할지 결정합니다.',
  'For outbound: confirm an explicit method exists — a NAT Gateway, a load balancer outbound rule, or a public IP on the NIC. Default outbound access was retired on 30 September 2025, so a new VM without one of these has no internet access at all.': '아웃바운드의 경우: NAT Gateway, 부하 분산 장치 아웃바운드 규칙 또는 NIC의 공용 IP 중 명시적인 방법이 있는지 확인하세요. 기본 아웃바운드 액세스는 2025년 9월 30일에 사용 중지되었으므로, 이 중 어느 것도 없는 새 VM은 인터넷에 전혀 연결할 수 없습니다.',
  'Front Door is a global Layer-7 entry point with content delivery and WAF built in.':
    'Front Door는 콘텐츠 배달과 WAF가 내장된 전역 계층 7 진입점입니다.',
  'Gateway, Firewall, and Bastion subnets must use their exact reserved names or deployment fails.':
    '게이트웨이, 방화벽, Bastion 서브넷은 정확히 예약된 이름을 사용해야 하며 그렇지 않으면 배포가 실패합니다.',
  'Hybrid flows depend on it, and it is frequently the piece nobody has console access to during a call.':
    '하이브리드 흐름이 여기에 의존하지만, 통화 중에 아무도 콘솔에 접근할 수 없는 부분인 경우가 많습니다.',
  'IKE phase 1/2 settings, PSK, and the IPsec policy must match EXACTLY on both ends.':
    'IKE 1/2단계 설정, PSK, IPsec 정책이 양쪽 끝에서 정확히 일치해야 합니다.',
  'IP forwarding must be enabled on the NVA NIC in Azure AND inside the guest OS.':
    'IP 전달은 Azure의 NVA NIC와 게스트 OS 내부 모두에서 사용하도록 설정해야 합니다.',
  'If the account firewall is set to selected networks, confirm the caller subnet or IP is listed.':
    '계정 방화벽이 선택한 네트워크로 설정되어 있다면 호출자 서브넷 또는 IP가 목록에 있는지 확인하세요.',
  'If the firewall is restricted, confirm the caller network or the trusted-services exception is allowed.':
    '방화벽이 제한되어 있다면 호출자 네트워크 또는 신뢰할 수 있는 서비스 예외가 허용되는지 확인하세요.',
  'Inbound and outbound are configured independently — confirm which direction is failing.':
    '인바운드와 아웃바운드는 각각 독립적으로 구성됩니다. 어느 방향이 실패하는지 확인하세요.',
  'Inbound and outbound endpoints each need their own delegated subnet.':
    '인바운드와 아웃바운드 엔드포인트는 각각 자체 위임 서브넷이 필요합니다.',
  'Inbound internet traffic lands on a public IP attached to a gateway, load balancer, or VM. Outbound traffic leaves through a NAT Gateway, a load balancer, or a firewall.':
    '인바운드 인터넷 트래픽은 게이트웨이, 부하 분산 장치 또는 VM에 연결된 공용 IP로 들어옵니다. 아웃바운드 트래픽은 NAT 게이트웨이, 부하 분산 장치 또는 방화벽을 통해 나갑니다.',
  'Inbound private access uses a Private Endpoint. Outbound access into a VNet uses regional VNet integration — the two are separate features.':
    '인바운드 프라이빗 액세스는 프라이빗 엔드포인트를 사용합니다. VNet으로의 아웃바운드 액세스는 지역 VNet 통합을 사용하며, 둘은 별개의 기능입니다.',
  'Individual public IPs are then allocated from the prefix and assigned to resources such as a NAT Gateway or load balancer.':
    '이후 개별 공용 IP가 접두사에서 할당되어 NAT 게이트웨이나 부하 분산 장치 같은 리소스에 지정됩니다.',
  'Instances share one network configuration and normally sit in a load balancer or Application Gateway backend pool.':
    '인스턴스는 하나의 네트워크 구성을 공유하며 보통 부하 분산 장치 또는 Application Gateway 백엔드 풀에 속합니다.',
  'It answers "is this being blocked, and by what?" with data instead of guesswork.':
    '추측이 아니라 데이터로 "이것이 차단되고 있는가, 무엇에 의해서인가?"에 답합니다.',
  'It attaches to Application Gateway or Front Door and runs in Detection mode (log only) or Prevention mode (block).':
    'Application Gateway 또는 Front Door에 연결되며 검색 모드(로그만) 또는 방지 모드(차단)로 동작합니다.',
  'It attaches to a subnet, a NIC, or both. Rules are evaluated by priority, lowest number first, and the first match wins. Because it is stateful, return traffic for an allowed flow is permitted automatically.':
    '서브넷, NIC 또는 둘 다에 연결됩니다. 규칙은 우선 순위 순으로, 낮은 번호부터 평가되며 처음 일치하는 규칙이 적용됩니다. 상태 저장 방식이므로 허용된 흐름의 반환 트래픽은 자동으로 허용됩니다.',
  'It attaches to a subnet. Azure picks the most specific matching prefix; if two routes tie, a UDR beats a BGP route, which beats a system route.':
    '서브넷에 연결됩니다. Azure는 가장 구체적으로 일치하는 접두사를 선택하며, 두 경로가 같으면 UDR이 BGP 경로보다, BGP 경로가 시스템 경로보다 우선합니다.',
  'It attaches to one or more subnets. Once attached, it takes priority over all other outbound methods for those subnets. It never allows unsolicited inbound traffic.':
    '하나 이상의 서브넷에 연결됩니다. 연결되면 해당 서브넷의 다른 모든 아웃바운드 방법보다 우선합니다. 요청하지 않은 인바운드 트래픽은 결코 허용하지 않습니다.',
  'It avoids the public internet entirely, giving predictable latency, higher bandwidth, and an SLA.':
    '공용 인터넷을 완전히 우회하여 예측 가능한 대기 시간, 더 높은 대역폭, SLA를 제공합니다.',
  'It blocks application-layer attacks that a Layer-4 firewall or NSG cannot see, because those only look at IP and port.':
    '계층 4 방화벽이나 NSG는 IP와 포트만 보기 때문에 볼 수 없는 애플리케이션 계층 공격을 차단합니다.',
  'It can be deployed into a VNet subnet for private access, or given a public IP for direct access.':
    '프라이빗 액세스를 위해 VNet 서브넷에 배포하거나, 직접 액세스를 위해 공용 IP를 부여할 수 있습니다.',
  'It can be external (public front end) or internal (VNet-only). In VNet mode it has strict required NSG rules and dependency endpoints.':
    '외부(공용 프런트엔드) 또는 내부(VNet 전용)일 수 있습니다. VNet 모드에서는 엄격한 필수 NSG 규칙과 종속성 엔드포인트가 있습니다.',
  'It can be reached publicly, or privately through a Private Endpoint with the matching Private DNS Zone.':
    '공개적으로 접근하거나, 일치하는 프라이빗 DNS 영역을 갖춘 프라이빗 엔드포인트를 통해 비공개로 접근할 수 있습니다.',
  'It cannot be used for inbound; if inbound is needed, that is a separate load balancer or public IP.':
    '인바운드에는 사용할 수 없습니다. 인바운드가 필요하면 별도의 부하 분산 장치나 공용 IP가 필요합니다.',
  'It carries the shared key, the IPsec/IKE policy, and the BGP setting for that specific link.':
    '해당 링크의 공유 키, IPsec/IKE 정책, BGP 설정을 담고 있습니다.',
  'It centralises egress control and logging, so one policy governs what an entire hub-and-spoke estate is allowed to reach.':
    '송신 제어와 로깅을 중앙집중화하여 하나의 정책으로 허브 앤 스포크 전체가 도달할 수 있는 대상을 통제합니다.',
  'It clarifies who experiences the behaviour being described.':
    '설명된 동작을 누가 겪고 있는지 명확히 합니다.',
  'It connects from the office LAN, from home, or through a VPN client, and each path resolves DNS differently.':
    '사무실 LAN, 집, 또는 VPN 클라이언트를 통해 연결되며 각 경로마다 DNS 확인 방식이 다릅니다.',
  'It connects over the public internet unless a VPN profile is applied.':
    'VPN 프로필이 적용되지 않는 한 공용 인터넷을 통해 연결됩니다.',
  'It connects to Azure through a Site-to-Site VPN tunnel or an ExpressRoute circuit. Routes are exchanged either statically or via BGP.':
    '사이트 간 VPN 터널 또는 ExpressRoute 회로를 통해 Azure에 연결됩니다. 경로는 정적으로 또는 BGP로 교환됩니다.',
  'It connects to a subnet through a NIC. Its reachability is governed by the NSG on that NIC and on the subnet, plus the guest OS firewall.':
    'NIC를 통해 서브넷에 연결됩니다. 도달성은 해당 NIC와 서브넷의 NSG, 그리고 게스트 OS 방화벽이 결정합니다.',
  'It gives container workloads scheduling, self-healing, and scaling without you operating Kubernetes masters.':
    'Kubernetes 마스터를 운영하지 않고도 컨테이너 워크로드에 스케줄링, 자가 복구, 확장을 제공합니다.',
  'It gives one consistent front door for many backends, with authentication, rate limiting, and transformation applied by policy.':
    '여러 백엔드에 대해 하나의 일관된 정문을 제공하며, 인증·속도 제한·변환이 정책으로 적용됩니다.',
  'It gives you a predictable, unchanging range so partners and firewalls can allow-list your egress addresses once.':
    '예측 가능하고 변하지 않는 범위를 제공하므로 파트너와 방화벽이 송신 주소를 한 번만 허용 목록에 넣으면 됩니다.',
  'It gives you a stable, known egress address and a very large pool of SNAT ports, which prevents the port-exhaustion failures common with default outbound access.':
    '안정적이고 알려진 송신 주소와 매우 큰 SNAT 포트 풀을 제공하여, 기본 아웃바운드 액세스에서 흔한 포트 고갈 장애를 방지합니다.',
  'It gives you private connectivity into the VNet over the public internet, without exposing resources publicly.':
    '리소스를 공개적으로 노출하지 않고 공용 인터넷을 통해 VNet으로 프라이빗 연결을 제공합니다.',
  'It gives your resources private IP addresses and a security boundary, so they can talk to each other privately instead of over the public internet.':
    '리소스에 개인 IP 주소와 보안 경계를 제공하여, 공용 인터넷 대신 비공개로 서로 통신할 수 있게 합니다.',
  'It groups resources with a shared lifecycle so they can be deployed, permissioned, and deleted together.':
    '수명 주기를 공유하는 리소스를 묶어 함께 배포·권한 부여·삭제할 수 있게 합니다.',
  'It handles scale and instance repair for you, so capacity follows demand without manual VM creation.':
    '확장과 인스턴스 복구를 대신 처리하므로 VM을 수동으로 만들지 않아도 용량이 수요를 따라갑니다.',
  'It injects the routes learned from on-premises into the VNet and forwards traffic onto the private circuit.':
    '온-프레미스에서 학습한 경로를 VNet에 주입하고 트래픽을 사설 회로로 전달합니다.',
  'It is deployed into a dedicated AzureBastionSubnet. The admin connects to the Azure portal over TLS, and Bastion opens the RDP or SSH session to the VM private IP.':
    '전용 AzureBastionSubnet에 배포됩니다. 관리자가 TLS로 Azure Portal에 연결하면 Bastion이 VM 개인 IP로 RDP 또는 SSH 세션을 엽니다.',
  'It is enabled per region. IP flow verify names the exact NSG rule that allowed or denied a flow; next hop shows where a packet would actually be routed.':
    '지역별로 사용하도록 설정합니다. IP 흐름 확인은 흐름을 허용 또는 거부한 정확한 NSG 규칙을 알려 주고, 다음 홉은 패킷이 실제로 어디로 라우팅되는지 보여 줍니다.',
  'It is reached over HTTPS. It can be locked down with firewall rules or a Private Endpoint, and callers usually authenticate with a managed identity.':
    'HTTPS로 접근합니다. 방화벽 규칙이나 프라이빗 엔드포인트로 잠글 수 있으며, 호출자는 보통 관리 ID로 인증합니다.',
  'It is reached over TCP 1433. The connection policy is Redirect (which also needs ports 11000-11999) or Proxy (1433 only).':
    'TCP 1433으로 접근합니다. 연결 정책은 Redirect(11000-11999 포트도 필요) 또는 Proxy(1433만)입니다.',
  'It is referenced by a Connection resource, which pairs it with the Azure VPN Gateway. With BGP, the prefix list is learned dynamically instead.':
    '연결 리소스가 이를 참조하여 Azure VPN 게이트웨이와 짝지어 줍니다. BGP를 사용하면 접두사 목록을 동적으로 학습합니다.',
  'It is the basic segmentation control in Azure, but it does not deny by default: the built-in AllowVNetInBound rule already permits all traffic inside the virtual network, so segmentation starts only when you add your own higher-priority deny.': 'Azure의 기본 세그먼트화 제어이지만 기본적으로 거부하지는 않습니다. 기본 제공 AllowVNetInBound 규칙이 가상 네트워크 내부의 모든 트래픽을 이미 허용하므로, 우선 순위가 더 높은 거부 규칙을 직접 추가해야 비로소 세그먼트화가 시작됩니다.',
  'It is the control plane. Control-plane and data-plane failures look similar to users but have different causes.':
    '제어 평면입니다. 제어 평면 장애와 데이터 평면 장애는 사용자에게 비슷해 보이지만 원인이 다릅니다.',
  'It is the destination doing the actual work — serving the page, running the query, hosting the application.':
    '실제 작업을 수행하는 대상입니다. 페이지를 제공하고, 쿼리를 실행하며, 애플리케이션을 호스팅합니다.',
  'It is the general-purpose durable store that most workloads read from and write to.':
    '대부분의 워크로드가 읽고 쓰는 범용 영구 저장소입니다.',
  'It is the most common place a reported issue is actually observed.':
    '보고된 문제가 실제로 관찰되는 가장 흔한 지점입니다.',
  'It is what makes a resource reachable from the internet, and it identifies your traffic when it leaves Azure.':
    '리소스를 인터넷에서 접근 가능하게 만들고, 트래픽이 Azure를 떠날 때 그 트래픽을 식별합니다.',
  'It is where a VM gets its IP configuration, and it is the most precise place to attach an NSG or check what rules and routes actually apply.':
    'VM이 IP 구성을 받는 곳이며, NSG를 연결하거나 실제로 어떤 규칙과 경로가 적용되는지 확인하기에 가장 정확한 위치입니다.',
  'It keeps credentials out of code and configuration, and gives you an audit trail of who read what.':
    '자격 증명을 코드와 구성에서 분리하고, 누가 무엇을 읽었는지에 대한 감사 추적을 제공합니다.',
  'It keeps firewall rules readable and lets you update one object instead of editing many rules.':
    '방화벽 규칙을 읽기 쉽게 유지하고, 여러 규칙을 수정하는 대신 개체 하나만 업데이트하면 되게 합니다.',
  'It keeps rules meaningful as the environment scales — "web can reach app" survives every IP change.':
    '환경이 확장되어도 규칙의 의미를 유지합니다. "web이 app에 도달할 수 있다"는 규칙은 모든 IP 변경에도 살아남습니다.',
  'It lets AKS workloads use Gateway API and Ingress objects to publish services without hand-managing gateway configuration.':
    'AKS 워크로드가 게이트웨이 구성을 수동으로 관리하지 않고 Gateway API와 Ingress 개체로 서비스를 게시할 수 있게 합니다.',
  'It lets you offer a service to customers or other business units without peering networks or exposing anything publicly.':
    '네트워크를 피어링하거나 무언가를 공개적으로 노출하지 않고도 고객이나 다른 사업부에 서비스를 제공할 수 있게 합니다.',
  'It lets you reach a PaaS service such as Storage or SQL over a private IP on the Microsoft backbone, so the public endpoint can be disabled entirely.':
    'Microsoft 백본의 개인 IP를 통해 Storage나 SQL 같은 PaaS 서비스에 접근할 수 있게 하므로 공용 엔드포인트를 완전히 비활성화할 수 있습니다.',
  'It lets you write rules once and inherit them across firewalls, with a parent policy for organisation-wide rules and child policies per environment.':
    '규칙을 한 번 작성해 여러 방화벽에 상속할 수 있게 하며, 조직 전체 규칙은 상위 정책에, 환경별 규칙은 하위 정책에 둡니다.',
  'It lives in the reserved GatewaySubnet and pairs with a Local Network Gateway (the remote device) through a Connection resource. Routes are static or learned via BGP.':
    '예약된 GatewaySubnet에 있으며 연결 리소스를 통해 로컬 네트워크 게이트웨이(원격 장치)와 짝을 이룹니다. 경로는 정적이거나 BGP로 학습됩니다.',
  'It marks where the user-visible experience begins, which is the perspective the customer is reporting from.':
    '사용자에게 보이는 경험이 시작되는 지점, 즉 고객이 보고하는 관점을 표시합니다.',
  'It never sees your traffic. It only returns a CNAME or IP in a DNS answer, so the client connects directly to the chosen endpoint afterwards.':
    '트래픽을 전혀 보지 않습니다. DNS 응답으로 CNAME이나 IP만 반환하므로 이후 클라이언트가 선택된 엔드포인트에 직접 연결합니다.',
  'It only works if DNS resolves the service hostname to the private IP. That is normally done with a Private DNS Zone linked to the VNet.':
    'DNS가 서비스 호스트 이름을 개인 IP로 확인해야만 동작합니다. 보통 VNet에 연결된 프라이빗 DNS 영역으로 이를 처리합니다.',
  'It provides a SQL Server-compatible database without you patching, backing up, or clustering servers.':
    '서버를 패치하거나 백업하거나 클러스터링하지 않고도 SQL Server 호환 데이터베이스를 제공합니다.',
  'It provides high availability and scale — if one backend instance fails its health probe, new connections stop going to it.':
    '고가용성과 확장성을 제공합니다. 백엔드 인스턴스가 상태 프로브에 실패하면 새 연결이 그쪽으로 가지 않습니다.',
  'It provides transit routing between everything attached to it, without you having to build gateway chaining or route tables by hand.':
    '게이트웨이 체이닝이나 경로 테이블을 직접 구성하지 않아도 연결된 모든 대상 간의 전송 라우팅을 제공합니다.',
  'It reaches Azure APIs over HTTPS, or reaches workloads directly over SSH, RDP, or an application port.':
    'HTTPS로 Azure API에 접근하거나 SSH, RDP 또는 애플리케이션 포트로 워크로드에 직접 접근합니다.',
  'It reaches Azure across a VPN tunnel or ExpressRoute circuit, or over the public internet.':
    'VPN 터널, ExpressRoute 회로 또는 공용 인터넷을 통해 Azure에 도달합니다.',
  'It removes OS patching and scaling work, so teams ship application code instead of infrastructure.':
    'OS 패치와 확장 작업을 없애 주므로 팀은 인프라 대신 애플리케이션 코드를 제공합니다.',
  'It removes the need to give VMs public IPs or open 3389/22 to the internet, which is one of the most exploited misconfigurations.':
    'VM에 공용 IP를 부여하거나 3389/22를 인터넷에 여는 일을 없애 줍니다. 이는 가장 많이 악용되는 잘못된 구성 중 하나입니다.',
  'It removes the work of building and maintaining your own hubs, route tables, and gateway meshes across many regions and branches.':
    '여러 지역과 지점에 걸쳐 자체 허브, 경로 테이블, 게이트웨이 메시를 구축하고 유지하는 작업을 없애 줍니다.',
  'It represents scripted or interactive commands, which are often where the reproduction steps live.':
    '스크립트 또는 대화형 명령을 나타내며, 재현 단계가 여기에 있는 경우가 많습니다.',
  'It resolves the target name through DNS and then connects to the returned address.':
    'DNS로 대상 이름을 확인한 뒤 반환된 주소에 연결합니다.',
  'It routes by URL path and hostname, terminates TLS so certificates live in one place, and can run a Web Application Firewall in front of your app.':
    'URL 경로와 호스트 이름으로 라우팅하고, TLS를 종료하여 인증서를 한곳에 모으며, 앱 앞에 웹 애플리케이션 방화벽을 둘 수 있습니다.',
  'It separates billing, applies quota limits, and acts as a scope for role assignments and policy.':
    '청구를 분리하고 할당량 한도를 적용하며 역할 할당과 정책의 범위 역할을 합니다.',
  'It shares the App Service networking model — Private Endpoint for inbound, VNet integration for outbound. The hosting plan decides what is available: Flex Consumption and Premium both support VNet integration, the classic Consumption plan does not.': 'App Service와 동일한 네트워킹 모델을 사용합니다. 인바운드는 Private Endpoint, 아웃바운드는 VNet 통합입니다. 사용할 수 있는 기능은 호스팅 계획에 따라 결정되며, Flex Consumption과 Premium은 모두 VNet 통합을 지원하지만 기존 Consumption 계획은 지원하지 않습니다.',
  'It sits in the GatewaySubnet and is linked to a circuit through a connection. Route exchange is always via BGP.':
    'GatewaySubnet에 위치하며 연결을 통해 회로와 연결됩니다. 경로 교환은 항상 BGP로 이루어집니다.',
  'It steers users to the closest or highest-priority region and removes failed regions from DNS answers.':
    '사용자를 가장 가깝거나 우선 순위가 가장 높은 지역으로 유도하고, 장애가 발생한 지역은 DNS 응답에서 제거합니다.',
  'It suits glue logic and triggers where running a full application host would be wasteful.':
    '전체 애플리케이션 호스트를 실행하기에는 낭비인 연결 로직과 트리거에 적합합니다.',
  'It suits short-lived or bursty jobs where a full Kubernetes cluster would be overkill.':
    '전체 Kubernetes 클러스터가 과한 단기 또는 급증형 작업에 적합합니다.',
  'It suits workloads that need multi-region replication and predictable latency at scale.':
    '대규모에서 다중 지역 복제와 예측 가능한 대기 시간이 필요한 워크로드에 적합합니다.',
  'It terminates the user connection at the nearest Microsoft edge site, which cuts latency, and it fails over between regional backends automatically.':
    '가장 가까운 Microsoft 에지 사이트에서 사용자 연결을 종료하여 대기 시간을 줄이고, 지역 백엔드 간 장애 조치를 자동으로 수행합니다.',
  'Key Vault stores secrets, keys, and certificates with access controlled by policy or RBAC.':
    'Key Vault는 정책 또는 RBAC로 액세스를 제어하며 비밀, 키, 인증서를 저장합니다.',
  'Make sure the return path has an equivalent route, or the flow becomes asymmetric and is dropped by the stateful firewall.':
    '반환 경로에도 동등한 경로가 있는지 확인하세요. 그렇지 않으면 흐름이 비대칭이 되어 상태 저장 방화벽이 폐기합니다.',
  'Management traffic often takes a completely different path from application traffic and has its own controls.':
    '관리 트래픽은 애플리케이션 트래픽과 전혀 다른 경로를 사용하는 경우가 많고 자체 제어 수단을 가집니다.',
  'Mobile clients frequently arrive over carrier networks or a Point-to-Site VPN, so their path differs from office clients.':
    '모바일 클라이언트는 통신사 네트워크나 지점 간 VPN을 통해 접속하는 경우가 많아 사무실 클라이언트와 경로가 다릅니다.',
  'Most enterprise workloads are hybrid, so Azure resources must reach systems that still live on-premises (and vice versa).':
    '대부분의 엔터프라이즈 워크로드는 하이브리드이므로 Azure 리소스가 여전히 온-프레미스에 있는 시스템에 도달해야 하며 그 반대도 마찬가지입니다.',
  'NAT Gateway is zonal — confirm the zone matches the workload for zone-resilient designs.':
    'NAT 게이트웨이는 영역 단위입니다. 영역 복원력 설계에서는 영역이 워크로드와 일치하는지 확인하세요.',
  'NAT Gateway provides outbound-only internet connectivity for a subnet, using dedicated public IPs.':
    'NAT 게이트웨이는 전용 공용 IP를 사용하여 서브넷에 아웃바운드 전용 인터넷 연결을 제공합니다.',
  'NSGs and UDRs affect a Private Endpoint only when the subnet has PrivateEndpointNetworkPolicies enabled — it is disabled by default, so a rule you expect to match may never be evaluated at all.': 'NSG와 UDR은 서브넷에서 PrivateEndpointNetworkPolicies가 사용하도록 설정된 경우에만 Private Endpoint에 적용됩니다. 기본값은 사용 안 함이므로, 일치할 것으로 예상한 규칙이 아예 평가되지 않을 수 있습니다.',
  'Native client and IP-based connection require the Standard or Premium SKU.':
    '네이티브 클라이언트와 IP 기반 연결에는 Standard 또는 Premium SKU가 필요합니다.',
  'Network Watcher is the diagnostics toolbox for Azure networking — connection troubleshoot, IP flow verify, next hop, packet capture, and flow logs.':
    'Network Watcher는 Azure 네트워킹 진단 도구 모음으로, 연결 문제 해결, IP 흐름 확인, 다음 홉, 패킷 캡처, 흐름 로그를 제공합니다.',
  'Azure CNI is the current plugin and the IP mode is what matters. In node-subnet or pod-subnet mode every pod gets a real VNet IP, so pod addresses must be planned into the subnet size; CNI Overlay instead puts pods on a separate overlay range and consumes far fewer VNet IPs. Legacy kubenet is retiring on 31 March 2028.': '현재 플러그인은 Azure CNI이며 중요한 것은 IP 모드입니다. node-subnet 또는 pod-subnet 모드에서는 모든 Pod가 실제 VNet IP를 받으므로 Pod 주소를 서브넷 크기에 반영해 계획해야 합니다. 반면 CNI Overlay는 Pod를 별도의 오버레이 범위에 배치하여 VNet IP를 훨씬 적게 사용합니다. 레거시 kubenet은 2028년 3월 31일에 사용 중지됩니다.',
  'Nothing reaches the right destination if the name resolves to the wrong address — DNS is the first hop of almost every flow.':
    '이름이 잘못된 주소로 확인되면 무엇도 올바른 대상에 도달하지 못합니다. DNS는 거의 모든 흐름의 첫 번째 홉입니다.',
  'On-premises clients cannot query Azure Private DNS Zones directly, and Azure clients often need to resolve on-premises names. The resolver bridges both directions.':
    '온-프레미스 클라이언트는 Azure 프라이빗 DNS 영역을 직접 쿼리할 수 없고, Azure 클라이언트는 온-프레미스 이름을 확인해야 할 때가 많습니다. 확인자가 양방향을 연결합니다.',
  'One VM can have multiple NICs, and each NIC can hold multiple IP configurations. Accelerated Networking is enabled per NIC.':
    'VM 하나에 여러 NIC를 둘 수 있고 각 NIC는 여러 IP 구성을 가질 수 있습니다. 가속 네트워킹은 NIC 단위로 사용하도록 설정합니다.',
  'Outbound type (load balancer, NAT Gateway, or userDefinedRouting) determines the egress path.':
    '아웃바운드 유형(부하 분산 장치, NAT 게이트웨이 또는 userDefinedRouting)이 송신 경로를 결정합니다.',
  'Over Private Link, confirm the privatelink.vaultcore.azure.net zone is linked to the VNet.':
    'Private Link를 사용할 때는 privatelink.vaultcore.azure.net 영역이 VNet에 연결되어 있는지 확인하세요.',
  'Over Private Link, verify the name resolves to the private IP.':
    'Private Link를 사용할 때는 이름이 개인 IP로 확인되는지 확인하세요.',
  'Portal actions call Azure Resource Manager over HTTPS; they do not traverse your VNet.':
    '포털 작업은 HTTPS로 Azure Resource Manager를 호출하며 VNet을 거치지 않습니다.',
  'Private Endpoint requires a DNS record for every region the account is replicated to.':
    '프라이빗 엔드포인트에는 계정이 복제되는 모든 지역에 대한 DNS 레코드가 필요합니다.',
  'Private Link Service publishes your own service, sitting behind a Standard internal load balancer, so other VNets can consume it via a Private Endpoint.':
    'Private Link Service는 Standard 내부 부하 분산 장치 뒤에 있는 사용자 서비스를 게시하여 다른 VNet이 프라이빗 엔드포인트로 이용할 수 있게 합니다.',
  'Public-facing workloads must be reachable from the internet, and most workloads need outbound internet access for updates and API calls.':
    '공개형 워크로드는 인터넷에서 도달 가능해야 하며, 대부분의 워크로드는 업데이트와 API 호출을 위해 아웃바운드 인터넷 액세스가 필요합니다.',
  'Real environments contain third-party appliances, SaaS endpoints, and legacy systems that still shape the traffic path.':
    '실제 환경에는 트래픽 경로를 좌우하는 타사 어플라이언스, SaaS 엔드포인트, 레거시 시스템이 존재합니다.',
  'Redirect policy requires 11000-11999 outbound to be open — this is a very common firewall oversight.':
    'Redirect 정책은 아웃바운드 11000-11999가 열려 있어야 합니다. 이는 매우 흔한 방화벽 누락입니다.',
  'Region choice controls latency to your users, data-residency compliance, and which services and SKUs are even available.':
    '지역 선택은 사용자까지의 대기 시간, 데이터 상주 규정 준수, 그리고 어떤 서비스와 SKU를 사용할 수 있는지까지 좌우합니다.',
  'Remember inbound is evaluated subnet-first then NIC; outbound is NIC-first then subnet.':
    '인바운드는 서브넷을 먼저, 그다음 NIC를 평가하고, 아웃바운드는 NIC를 먼저, 그다음 서브넷을 평가한다는 점을 기억하세요.',
  'Resource group membership never blocks traffic — if something is unreachable, look at NSG, UDR, DNS, or peering instead.':
    '리소스 그룹 소속은 결코 트래픽을 차단하지 않습니다. 도달할 수 없다면 대신 NSG, UDR, DNS, 피어링을 살펴보세요.',
  'Resources are placed in subnets inside the VNet. Everything in the same VNet can reach everything else by default; reaching another VNet requires peering, a gateway, or Private Link.':
    '리소스는 VNet 내부의 서브넷에 배치됩니다. 동일한 VNet 안의 모든 것은 기본적으로 서로 도달할 수 있으며, 다른 VNet에 도달하려면 피어링, 게이트웨이 또는 Private Link가 필요합니다.',
  'Resources in different subscriptions can still be peered and connected, but quota, policy, and RBAC are evaluated per subscription.':
    '서로 다른 구독의 리소스도 피어링하고 연결할 수 있지만, 할당량·정책·RBAC는 구독별로 평가됩니다.',
  'Rule collection groups are evaluated by priority, and inherited parent rules always run before child rules.':
    '규칙 컬렉션 그룹은 우선 순위에 따라 평가되며, 상속된 상위 규칙이 항상 하위 규칙보다 먼저 실행됩니다.',
  'Run IP flow verify for the failing 5-tuple — it names the deciding rule directly.':
    '실패한 5-튜플에 대해 IP 흐름 확인을 실행하세요. 결정적인 규칙을 바로 알려 줍니다.',
  'Run next hop from the source NIC to confirm the routing decision.':
    '라우팅 결정을 확인하려면 원본 NIC에서 다음 홉을 실행하세요.',
  'Secured hub (Routing Intent) changes the path — confirm whether traffic is being sent to Azure Firewall.':
    '보안 허브(라우팅 의도)는 경로를 변경합니다. 트래픽이 Azure Firewall로 전송되고 있는지 확인하세요.',
  'Service tags change over time; prefer them over hard-coded IP ranges.':
    '서비스 태그는 시간이 지나며 변경됩니다. 하드코딩된 IP 범위보다 서비스 태그를 사용하세요.',
  'Standard SKU addresses are static and secure-by-default — inbound is denied unless an NSG allows it. Basic SKU is retired.':
    'Standard SKU 주소는 고정이며 기본적으로 안전합니다. NSG가 허용하지 않는 한 인바운드는 거부됩니다. Basic SKU는 사용 중단되었습니다.',
  'Subnets let you segment a VNet so different tiers (web, app, data) can be secured and routed independently.':
    '서브넷을 사용하면 VNet을 분할하여 웹·앱·데이터 등 계층별로 보안과 라우팅을 독립적으로 적용할 수 있습니다.',
  'Test on and off the corporate network — a split-tunnel VPN policy often explains "works for some users".':
    '회사 네트워크 안팎에서 모두 테스트하세요. 분할 터널 VPN 정책이 "일부 사용자만 정상"인 이유인 경우가 많습니다.',
  'The ALB controller in the cluster watches Kubernetes objects and programs the gateway, forwarding HTTP/HTTPS traffic straight to pod endpoints.':
    '클러스터의 ALB 컨트롤러가 Kubernetes 개체를 감시하고 게이트웨이를 구성하여 HTTP/HTTPS 트래픽을 파드 엔드포인트로 바로 전달합니다.',
  'The Azure portal — the browser-based management plane at portal.azure.com.':
    'Azure Portal, 즉 portal.azure.com의 브라우저 기반 관리 평면입니다.',
  'The NAT subnet must have enough free IP addresses for the number of connections.':
    'NAT 서브넷에는 연결 수를 감당할 만큼 사용 가능한 IP 주소가 있어야 합니다.',
  'The SDK can use direct mode, which opens additional TCP ports beyond 443, or gateway mode which uses 443 only.':
    'SDK는 443 외에 추가 TCP 포트를 여는 직접 모드나 443만 사용하는 게이트웨이 모드를 쓸 수 있습니다.',
  'The backend must be behind a Standard SKU internal load balancer — Basic is not supported.':
    '백엔드는 Standard SKU 내부 부하 분산 장치 뒤에 있어야 하며 Basic은 지원되지 않습니다.',
  'The circuit carries one or more peerings. Private peering reaches your VNets; Microsoft peering reaches Microsoft public services such as Microsoft 365.':
    '회로는 하나 이상의 피어링을 전달합니다. 프라이빗 피어링은 사용자 VNet에, Microsoft 피어링은 Microsoft 365 같은 Microsoft 공용 서비스에 도달합니다.',
  'The client resolves a name through DNS, then connects to whatever public or private IP that name returns.':
    '클라이언트는 DNS로 이름을 확인한 뒤 그 이름이 반환하는 공용 또는 개인 IP에 연결합니다.',
  'The end user or client device that starts the request.':
    '요청을 시작하는 최종 사용자 또는 클라이언트 장치입니다.',
  'The function needs reachable storage; a blocked storage account stops the function starting at all.':
    '함수에는 도달 가능한 스토리지가 필요합니다. 스토리지 계정이 차단되면 함수가 아예 시작되지 않습니다.',
  'The gateway alone does nothing; the connection is what actually establishes and holds the tunnel or circuit link.':
    '게이트웨이만으로는 아무 일도 일어나지 않습니다. 터널이나 회로 링크를 실제로 수립하고 유지하는 것은 연결입니다.',
  'The guest OS firewall is a separate layer from the NSG — Windows Firewall or iptables can block traffic the NSG allowed.':
    '게스트 OS 방화벽은 NSG와 별개의 계층입니다. Windows 방화벽이나 iptables가 NSG에서 허용한 트래픽을 차단할 수 있습니다.',
  'The plan is associated with a VNet, and every public IP in that VNet is then protected.':
    '계획을 VNet에 연결하면 해당 VNet의 모든 공용 IP가 보호됩니다.',
  'The public internet — traffic arriving from, or leaving to, addresses outside your network.':
    '공용 인터넷, 즉 네트워크 외부 주소에서 들어오거나 그쪽으로 나가는 트래픽입니다.',
  'The subnet must be named exactly AzureBastionSubnet and be /26 or larger.':
    '서브넷 이름은 정확히 AzureBastionSubnet이어야 하며 /26 이상이어야 합니다.',
  'The target VM NSG must allow inbound 3389/22 FROM the Bastion subnet.':
    '대상 VM의 NSG는 Bastion 서브넷에서 오는 인바운드 3389/22를 허용해야 합니다.',
  'The user resolves your hostname to the closest edge POP. The edge applies WAF and caching rules, then forwards over the Microsoft backbone to the healthiest origin.':
    '사용자는 호스트 이름을 가장 가까운 에지 POP으로 확인합니다. 에지는 WAF와 캐싱 규칙을 적용한 뒤 Microsoft 백본을 통해 가장 상태가 좋은 원본으로 전달합니다.',
  'This represents the customer network outside Azure — a corporate datacenter, branch office, or another cloud.':
    'Azure 외부의 고객 네트워크, 즉 회사 데이터 센터, 지사 또는 다른 클라우드를 나타냅니다.',
  'Traffic Manager is DNS-based global load balancing — it answers DNS queries with the endpoint you should use.':
    'Traffic Manager는 DNS 기반 전역 부하 분산으로, 사용해야 할 엔드포인트를 DNS 쿼리에 대한 응답으로 알려 줍니다.',
  'Traffic is steered to it with a UDR. For high availability it sits behind an internal load balancer, and its NIC must have IP forwarding enabled.':
    'UDR로 트래픽을 이쪽으로 유도합니다. 고가용성을 위해 내부 부하 분산 장치 뒤에 두며, NIC에서 IP 전달을 사용하도록 설정해야 합니다.',
  'Traffic is steered to it with a User-Defined Route pointing at its private IP. Rules are evaluated in order: DNAT, then network rules, then application rules.':
    '개인 IP를 가리키는 사용자 정의 경로로 트래픽을 유도합니다. 규칙은 DNAT, 네트워크 규칙, 애플리케이션 규칙 순으로 평가됩니다.',
  'Treat it like any other hop: confirm what it listens on, what it forwards to, and who controls its rules.':
    '다른 홉과 동일하게 다루세요. 무엇을 수신 대기하는지, 어디로 전달하는지, 누가 규칙을 통제하는지 확인하세요.',
  'Use Effective security rules on the NIC — that shows the merged subnet + NIC result, which is what actually applies.':
    'NIC에서 유효 보안 규칙을 사용하세요. 서브넷과 NIC를 병합한 결과, 즉 실제로 적용되는 내용을 보여 줍니다.',
  'Use effective routes on a workload NIC to prove the on-premises prefixes really arrived.':
    '온-프레미스 접두사가 실제로 도착했는지 입증하려면 워크로드 NIC에서 유효 경로를 확인하세요.',
  'Used as a generic actor when the exact device does not matter.':
    '정확한 장치가 중요하지 않을 때 일반적인 행위자로 사용됩니다.',
  'VNet connections, VPN sites, and ExpressRoute circuits attach to the hub, and hub route tables control who can reach whom.':
    'VNet 연결, VPN 사이트, ExpressRoute 회로가 허브에 연결되며, 허브 경로 테이블이 누가 누구에게 도달할 수 있는지 제어합니다.',
  'VNet-deployed container groups need a delegated subnet.':
    'VNet에 배포된 컨테이너 그룹에는 위임된 서브넷이 필요합니다.',
  'VNet-injected APIM requires specific inbound NSG rules; missing them makes the service unhealthy.':
    'VNet에 삽입된 APIM에는 특정 인바운드 NSG 규칙이 필요하며, 이를 누락하면 서비스가 비정상 상태가 됩니다.',
  'Verify the SKU supports the tunnel count and throughput you need.':
    'SKU가 필요한 터널 수와 처리량을 지원하는지 확인하세요.',
  'Verify the VNet address space does not overlap with any peered VNet or the on-premises network.':
    'VNet 주소 공간이 피어링된 VNet이나 온-프레미스 네트워크와 겹치지 않는지 확인하세요.',
  'Verify the downstream party has allow-listed the whole prefix, not one address from it.':
    '상대 측이 접두사에서 주소 하나가 아니라 접두사 전체를 허용 목록에 넣었는지 확인하세요.',
  'Verify the target on-premises DNS server actually answers queries from the Azure source range.':
    '대상 온-프레미스 DNS 서버가 Azure 원본 범위에서 오는 쿼리에 실제로 응답하는지 확인하세요.',
  'Verify you have not hit a subscription-level quota (public IPs, VNet peerings, gateway count).':
    '구독 수준 할당량(공용 IP, VNet 피어링, 게이트웨이 수)에 도달하지 않았는지 확인하세요.',
  'Virtual WAN is a managed networking service that provides a global transit hub-and-spoke backbone.':
    'Virtual WAN은 전역 전송 허브 앤 스포크 백본을 제공하는 관리형 네트워킹 서비스입니다.',
  'Watch for overlapping address space between on-premises and the Azure VNet — that breaks routing.':
    '온-프레미스와 Azure VNet 간 주소 공간이 겹치는지 주의하세요. 라우팅이 깨집니다.',
  'You assign NICs to the ASG, then reference the ASG as the source or destination in NSG rules.':
    'NIC를 ASG에 할당한 다음, NSG 규칙에서 원본이나 대상으로 해당 ASG를 참조합니다.',
  'You create hubs per region and connect VNets, branches (VPN), and ExpressRoute circuits to them. Microsoft handles the any-to-any routing between hubs.':
    '지역별로 허브를 만들고 VNet, 지점(VPN), ExpressRoute 회로를 연결합니다. 허브 간 모든 대상 간 라우팅은 Microsoft가 처리합니다.',
  'You need it whenever traffic must take a path Azure would not choose on its own — for example forcing all egress through a firewall or NVA.':
    'Azure가 스스로 선택하지 않을 경로로 트래픽을 보내야 할 때 필요합니다. 예를 들어 모든 송신을 방화벽이나 NVA로 강제하는 경우입니다.',
  'Zone-redundant vs zonal matters for availability during a zone outage.':
    '영역 중복인지 영역 단위인지는 영역 장애 시 가용성에 중요합니다.',
};

export const KNOWLEDGE_DICT: Partial<Record<string, Dict>> = { ja, zh, es, pt, fr, de, ko };
