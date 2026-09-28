import type { Dict } from './strings';
import type { LangCode } from './i18n-store';

/**
 * EDGE_KNOWLEDGE translation dictionary.
 *
 * Recovered in v0.9.45. These sentences used to live in `strings-story.ts`
 * alongside the Story Mode narration templates, because Story Mode was the
 * only thing that rendered them. v0.9.37 moved the knowledge base onto the
 * Property Panel, which made these strings load-bearing for a surface that
 * has nothing to do with the walkthrough — so when v0.9.45 deleted Story
 * Mode, deleting this prose with it silently reverted the edge Details card
 * to English in all seven translated languages.
 *
 * Keys are the English text in `EDGE_KNOWLEDGE` (`src/demo/resource-knowledge.ts`)
 * byte for byte. Change an English sentence there and you MUST change the key
 * here, or that sentence silently falls back to English.
 *
 * `strings-knowledge.ts` is the per-RESOURCE companion to this file and was
 * never affected — it lives in its own file and always has.
 */
const ja: Dict = {
  'A DNS query — the client asking what IP address a name maps to.':
    'DNS クエリ — クライアントが、ある名前がどの IP アドレスに対応するかを問い合わせる処理です。',
  'A Private Endpoint connection reaches a PaaS service through a private IP inside your own subnet.':
    'プライベート エンドポイント接続は、自分のサブネット内のプライベート IP を経由して PaaS サービスに到達します。',
  'A Site-to-Site VPN carries traffic inside an encrypted IPsec/IKE tunnel over the public internet.':
    'サイト間 VPN は、パブリック インターネット上の暗号化された IPsec/IKE トンネル内でトラフィックを転送します。',
  'A general connection between two components in this design.': 'この構成内の 2 つのコンポーネント間の一般的な接続です。',
  'A public-internet request arriving at, or leaving from, your environment.':
    'ご利用の環境に到達する、またはそこから出ていくパブリック インターネット経由の要求です。',
  'Address spaces must not overlap.': 'アドレス空間が重複していないことが必要です。',
  'Backend-pool traffic — the load balancer or gateway forwarding a request to a member instance.':
    'バックエンド プールへのトラフィック — ロード バランサーまたはゲートウェイが、要求をメンバー インスタンスへ転送します。',
  'Both peering links must show Connected; a one-sided peering does not pass traffic.':
    '両側のピアリング リンクが [接続済み] になっている必要があります。片側だけのピアリングではトラフィックは流れません。',
  'Cached answers persist past a fix — flush the cache before retesting.':
    'キャッシュされた応答は修正後も残ります。再テストの前にキャッシュをクリアしてください。',
  'Check BGP session state and the received route count on both the primary and secondary link.':
    'プライマリとセカンダリの両方のリンクで、BGP セッションの状態と受信ルート数を確認します。',
  'Check that UDP AND TCP port 53 are permitted end to end.':
    'UDP と TCP の両方のポート 53 が、経路全体で許可されていることを確認します。',
  'Check the health probe result for every pool member.': 'プール メンバーごとに正常性プローブの結果を確認します。',
  'Check whether a corporate proxy or TLS-inspection device sits in the path.':
    '経路上に社内プロキシや TLS 検査装置が存在しないかを確認します。',
  'Confirm no NSG or firewall rule denies the specific port in use.':
    '使用しているポートを拒否する NSG またはファイアウォールの規則がないことを確認します。',
  'Confirm the NSG on the backend allows the probe source and the data port.':
    'バックエンド側の NSG が、プローブの送信元とデータ用ポートを許可していることを確認します。',
  'Confirm the relevant privatelink DNS zone is linked to the client VNet.':
    '該当する privatelink の DNS ゾーンが、クライアント側の VNet にリンクされていることを確認します。',
  'Confirm the route from source to destination with Network Watcher next hop.':
    'Network Watcher の次ホップで、送信元から宛先までの経路を確認します。',
  'Confirm the traffic selectors or Local Network Gateway prefixes include the specific subnets in this flow.':
    'トラフィック セレクターまたはローカル ネットワーク ゲートウェイのプレフィックスに、このフローで使用するサブネットが含まれていることを確認します。',
  'Confirm which DNS server the client is actually using.': 'クライアントが実際に使用している DNS サーバーを確認します。',
  'Confirm which peering the flow uses: private peering for VNets, Microsoft peering for Microsoft public services.':
    'このフローがどのピアリングを使用しているかを確認します。VNet 宛てはプライベート ピアリング、Microsoft のパブリック サービス宛ては Microsoft ピアリングです。',
  'DNS decides where the traffic goes. A wrong answer sends an otherwise perfect network path to the wrong destination.':
    'トラフィックの行き先を決めるのは DNS です。応答が誤っていると、ネットワーク経路が完璧でも誤った宛先に送られます。',
  'DNS must resolve the service hostname to the private IP — this is the most common failure by a wide margin.':
    'DNS がサービスのホスト名をプライベート IP に解決する必要があります。これが圧倒的に多い失敗原因です。',
  'Enable "Allow gateway transit" on the hub and "Use remote gateway" on the spoke for hybrid connectivity.':
    'ハイブリッド接続では、ハブ側で [ゲートウェイ転送を許可する]、スポーク側で [リモート ゲートウェイを使用する] を有効にします。',
  'ExpressRoute is a private Layer-3 circuit between your network and Microsoft, provided by a connectivity partner.':
    'ExpressRoute は、接続プロバイダーが提供する、お客様のネットワークと Microsoft を結ぶプライベートなレイヤー 3 回線です。',
  'For inbound, confirm the public IP, the NSG rule, and backend health.':
    '受信方向では、パブリック IP、NSG 規則、バックエンドの正常性を確認します。',
  'For outbound, confirm an explicit egress method exists (NAT Gateway, load balancer, or firewall).':
    '送信方向では、明示的なエグレス手段 (NAT ゲートウェイ、ロード バランサー、ファイアウォール) が構成されていることを確認します。',
  'It gives low-latency, high-bandwidth connectivity between VNets without a gateway, VPN, or public exposure.':
    'ゲートウェイや VPN、パブリックへの公開なしで、VNet 間に低遅延で広帯域の接続を提供します。',
  'It gives predictable latency, higher and more consistent bandwidth, and an SLA, because traffic never touches the public internet.':
    'トラフィックがパブリック インターネットを一切経由しないため、予測可能な遅延、より高く安定した帯域幅、および SLA が得られます。',
  'It is the hop where a healthy front end can still fail, because only healthy pool members receive traffic.':
    '正常なプール メンバーだけがトラフィックを受け取るため、フロントエンドが正常でも失敗しうるホップです。',
  'It is the quickest way to get private hybrid connectivity, with no carrier provisioning lead time.':
    '通信事業者のプロビジョニング期間を待たずに、最短でプライベートなハイブリッド接続を実現できる方法です。',
  'It keeps the traffic on the Microsoft backbone and lets you turn off the service public endpoint entirely.':
    'トラフィックを Microsoft バックボーン内に保ち、サービスのパブリック エンドポイントを完全に無効化できます。',
  'It shows a dependency — if this link breaks, the destination becomes unreachable from the source.':
    '依存関係を示します。このリンクが切れると、送信元から宛先に到達できなくなります。',
  'On-premises clients need a conditional forwarder or DNS Private Resolver to get the same private answer.':
    'オンプレミスのクライアントで同じプライベートな応答を得るには、条件付きフォワーダーまたは DNS Private Resolver が必要です。',
  'Peering is NOT transitive — A-to-B and B-to-C does not give A-to-C without gateway transit or a UDR through an appliance.':
    'ピアリングは推移的ではありません。A-B と B-C があっても、ゲートウェイ転送やアプライアンス経由の UDR がなければ A-C の通信はできません。',
  'Phase 1 and phase 2 parameters, plus the shared key, must match exactly on both ends.':
    'フェーズ 1 とフェーズ 2 のパラメーター、および共有キーが、両端で完全に一致している必要があります。',
  'Route limits apply — exceeding them drops the session.': 'ルート数の上限があります。超過するとセッションが切断されます。',
  'Run the lookup from the client itself and compare it with the expected address.':
    'クライアント自身から名前解決を実行し、期待されるアドレスと比較します。',
  'This is the least controlled part of the path, and the part most often restricted by an intermediate firewall or proxy.':
    '経路の中で最も制御が及ばない区間であり、途中のファイアウォールやプロキシによって制限されることが最も多い部分です。',
  'Throughput and latency depend on the internet path — check for packet loss before blaming Azure.':
    'スループットと遅延はインターネット経路に依存します。Azure 側の問題と判断する前に、パケット ロスを確認してください。',
  'UDP 500 and UDP 4500 must be open on the on-premises firewall.':
    'オンプレミスのファイアウォールで UDP 500 と UDP 4500 が開放されている必要があります。',
  'VNet peering privately connects two virtual networks so their resources can talk using private IP addresses.':
    'VNet ピアリングは 2 つの仮想ネットワークをプライベートに接続し、それぞれのリソースがプライベート IP アドレスで通信できるようにします。',
  'Verify the application is listening on the backend port that the rule targets.':
    '規則が対象とするバックエンド ポートで、アプリケーションが実際に受信待ち状態になっていることを確認します。',
};

const zh: Dict = {
  'A DNS query — the client asking what IP address a name maps to.':
    'DNS 查询 — 客户端询问某个名称对应哪个 IP 地址。',
  'A Private Endpoint connection reaches a PaaS service through a private IP inside your own subnet.':
    '专用终结点连接通过你自己子网内的专用 IP 访问 PaaS 服务。',
  'A Site-to-Site VPN carries traffic inside an encrypted IPsec/IKE tunnel over the public internet.':
    '站点到站点 VPN 在公共 Internet 上通过加密的 IPsec/IKE 隧道传输流量。',
  'A general connection between two components in this design.': '此架构中两个组件之间的一般连接。',
  'A public-internet request arriving at, or leaving from, your environment.': '进入或离开你环境的公共 Internet 请求。',
  'Address spaces must not overlap.': '地址空间不能重叠。',
  'Backend-pool traffic — the load balancer or gateway forwarding a request to a member instance.':
    '后端池流量 — 负载均衡器或网关将请求转发到某个成员实例。',
  'Both peering links must show Connected; a one-sided peering does not pass traffic.':
    '两侧的对等互连链接都必须显示为“已连接”；单侧对等互连无法传递流量。',
  'Cached answers persist past a fix — flush the cache before retesting.':
    '缓存的解析结果在修复后仍会保留 — 重新测试前请清除缓存。',
  'Check BGP session state and the received route count on both the primary and secondary link.':
    '在主链路和辅助链路上都检查 BGP 会话状态和接收到的路由数量。',
  'Check that UDP AND TCP port 53 are permitted end to end.': '确认端到端都放行了 UDP 和 TCP 的 53 端口。',
  'Check the health probe result for every pool member.': '检查每个池成员的运行状况探测结果。',
  'Check whether a corporate proxy or TLS-inspection device sits in the path.': '检查路径中是否存在企业代理或 TLS 检查设备。',
  'Confirm no NSG or firewall rule denies the specific port in use.': '确认没有 NSG 或防火墙规则拒绝所使用的具体端口。',
  'Confirm the NSG on the backend allows the probe source and the data port.':
    '确认后端上的 NSG 允许探测源地址和数据端口。',
  'Confirm the relevant privatelink DNS zone is linked to the client VNet.':
    '确认相关的 privatelink DNS 区域已链接到客户端 VNet。',
  'Confirm the route from source to destination with Network Watcher next hop.':
    '使用 Network Watcher 的下一跃点确认从源到目标的路由。',
  'Confirm the traffic selectors or Local Network Gateway prefixes include the specific subnets in this flow.':
    '确认流量选择器或本地网络网关的前缀包含此流量所涉及的具体子网。',
  'Confirm which DNS server the client is actually using.': '确认客户端实际使用的是哪台 DNS 服务器。',
  'Confirm which peering the flow uses: private peering for VNets, Microsoft peering for Microsoft public services.':
    '确认此流量使用哪种对等互连：访问 VNet 使用专用对等互连，访问 Microsoft 公共服务使用 Microsoft 对等互连。',
  'DNS decides where the traffic goes. A wrong answer sends an otherwise perfect network path to the wrong destination.':
    'DNS 决定流量去往何处。解析结果错误时，即使网络路径完全正常，流量也会被送到错误的目标。',
  'DNS must resolve the service hostname to the private IP — this is the most common failure by a wide margin.':
    'DNS 必须将服务主机名解析为专用 IP — 这是最常见的故障原因，远超其他因素。',
  'Enable "Allow gateway transit" on the hub and "Use remote gateway" on the spoke for hybrid connectivity.':
    '对于混合连接，请在中心（hub）启用“允许网关传输”，在分支（spoke）启用“使用远程网关”。',
  'ExpressRoute is a private Layer-3 circuit between your network and Microsoft, provided by a connectivity partner.':
    'ExpressRoute 是由连接合作伙伴提供的、连接你的网络与 Microsoft 的专用第 3 层线路。',
  'For inbound, confirm the public IP, the NSG rule, and backend health.':
    '对于入站流量，请确认公共 IP、NSG 规则和后端运行状况。',
  'For outbound, confirm an explicit egress method exists (NAT Gateway, load balancer, or firewall).':
    '对于出站流量，请确认存在显式的出口方式（NAT 网关、负载均衡器或防火墙）。',
  'It gives low-latency, high-bandwidth connectivity between VNets without a gateway, VPN, or public exposure.':
    '它可在 VNet 之间提供低延迟、高带宽的连接，无需网关、VPN 或公开暴露。',
  'It gives predictable latency, higher and more consistent bandwidth, and an SLA, because traffic never touches the public internet.':
    '由于流量完全不经过公共 Internet，因此可获得可预测的延迟、更高且更稳定的带宽以及 SLA。',
  'It is the hop where a healthy front end can still fail, because only healthy pool members receive traffic.':
    '在这一跃点，即使前端正常，流量仍可能失败，因为只有运行状况正常的池成员才会接收流量。',
  'It is the quickest way to get private hybrid connectivity, with no carrier provisioning lead time.':
    '这是获得专用混合连接最快的方式，无需等待运营商的开通周期。',
  'It keeps the traffic on the Microsoft backbone and lets you turn off the service public endpoint entirely.':
    '它让流量保持在 Microsoft 主干网络上，并允许你完全关闭服务的公共终结点。',
  'It shows a dependency — if this link breaks, the destination becomes unreachable from the source.':
    '它表示一种依赖关系 — 如果此链接中断，源将无法访问目标。',
  'On-premises clients need a conditional forwarder or DNS Private Resolver to get the same private answer.':
    '本地客户端需要条件转发器或 DNS 专用解析器，才能获得同样的专用解析结果。',
  'Peering is NOT transitive — A-to-B and B-to-C does not give A-to-C without gateway transit or a UDR through an appliance.':
    '对等互连不具备传递性 — 有 A 到 B 和 B 到 C，并不代表 A 能到 C，除非使用网关传输或经由设备的 UDR。',
  'Phase 1 and phase 2 parameters, plus the shared key, must match exactly on both ends.':
    '第 1 阶段和第 2 阶段的参数以及共享密钥必须在两端完全一致。',
  'Route limits apply — exceeding them drops the session.': '存在路由数量上限 — 超出会导致会话中断。',
  'Run the lookup from the client itself and compare it with the expected address.':
    '从客户端本机执行解析，并与预期地址进行比较。',
  'This is the least controlled part of the path, and the part most often restricted by an intermediate firewall or proxy.':
    '这是整条路径中受控程度最低的部分，也是最常被中间防火墙或代理限制的部分。',
  'Throughput and latency depend on the internet path — check for packet loss before blaming Azure.':
    '吞吐量和延迟取决于 Internet 路径 — 在归咎于 Azure 之前，请先检查是否存在丢包。',
  'UDP 500 and UDP 4500 must be open on the on-premises firewall.': '本地防火墙上必须开放 UDP 500 和 UDP 4500。',
  'VNet peering privately connects two virtual networks so their resources can talk using private IP addresses.':
    'VNet 对等互连以专用方式连接两个虚拟网络，使其资源可以使用专用 IP 地址通信。',
  'Verify the application is listening on the backend port that the rule targets.':
    '确认应用程序正在规则所指向的后端端口上侦听。',
};

const es: Dict = {
  'A DNS query — the client asking what IP address a name maps to.':
    'Una consulta DNS: el cliente pregunta a qué dirección IP corresponde un nombre.',
  'A Private Endpoint connection reaches a PaaS service through a private IP inside your own subnet.':
    'Una conexión de punto de conexión privado llega a un servicio PaaS mediante una IP privada dentro de su propia subred.',
  'A Site-to-Site VPN carries traffic inside an encrypted IPsec/IKE tunnel over the public internet.':
    'Una VPN de sitio a sitio transporta el tráfico dentro de un túnel IPsec/IKE cifrado a través de Internet público.',
  'A general connection between two components in this design.': 'Una conexión general entre dos componentes de este diseño.',
  'A public-internet request arriving at, or leaving from, your environment.':
    'Una solicitud de Internet público que llega a su entorno o sale de él.',
  'Address spaces must not overlap.': 'Los espacios de direcciones no deben solaparse.',
  'Backend-pool traffic — the load balancer or gateway forwarding a request to a member instance.':
    'Tráfico del grupo de back-end: el equilibrador de carga o la puerta de enlace reenvía una solicitud a una instancia miembro.',
  'Both peering links must show Connected; a one-sided peering does not pass traffic.':
    'Ambos vínculos de emparejamiento deben aparecer como Conectado; un emparejamiento unilateral no deja pasar tráfico.',
  'Cached answers persist past a fix — flush the cache before retesting.':
    'Las respuestas en caché persisten después de una corrección: vacíe la caché antes de volver a probar.',
  'Check BGP session state and the received route count on both the primary and secondary link.':
    'Compruebe el estado de la sesión BGP y el número de rutas recibidas en el vínculo principal y en el secundario.',
  'Check that UDP AND TCP port 53 are permitted end to end.':
    'Compruebe que el puerto 53 esté permitido de extremo a extremo tanto en UDP COMO en TCP.',
  'Check the health probe result for every pool member.':
    'Compruebe el resultado del sondeo de estado de cada miembro del grupo.',
  'Check whether a corporate proxy or TLS-inspection device sits in the path.':
    'Compruebe si hay un proxy corporativo o un dispositivo de inspección TLS en la ruta.',
  'Confirm no NSG or firewall rule denies the specific port in use.':
    'Confirme que ninguna regla de NSG o de firewall deniega el puerto concreto que se está usando.',
  'Confirm the NSG on the backend allows the probe source and the data port.':
    'Confirme que el NSG del back-end permite el origen del sondeo y el puerto de datos.',
  'Confirm the relevant privatelink DNS zone is linked to the client VNet.':
    'Confirme que la zona DNS privatelink correspondiente está vinculada a la VNet del cliente.',
  'Confirm the route from source to destination with Network Watcher next hop.':
    'Confirme la ruta del origen al destino con el próximo salto de Network Watcher.',
  'Confirm the traffic selectors or Local Network Gateway prefixes include the specific subnets in this flow.':
    'Confirme que los selectores de tráfico o los prefijos de la puerta de enlace de red local incluyen las subredes concretas de este flujo.',
  'Confirm which DNS server the client is actually using.': 'Confirme qué servidor DNS está usando realmente el cliente.',
  'Confirm which peering the flow uses: private peering for VNets, Microsoft peering for Microsoft public services.':
    'Confirme qué emparejamiento usa el flujo: emparejamiento privado para VNets y emparejamiento de Microsoft para los servicios públicos de Microsoft.',
  'DNS decides where the traffic goes. A wrong answer sends an otherwise perfect network path to the wrong destination.':
    'El DNS decide adónde va el tráfico. Una respuesta incorrecta envía una ruta de red por lo demás perfecta al destino equivocado.',
  'DNS must resolve the service hostname to the private IP — this is the most common failure by a wide margin.':
    'El DNS debe resolver el nombre de host del servicio a la IP privada: este es, con diferencia, el fallo más habitual.',
  'Enable "Allow gateway transit" on the hub and "Use remote gateway" on the spoke for hybrid connectivity.':
    'Habilite "Permitir tránsito de puerta de enlace" en el concentrador y "Usar puerta de enlace remota" en el radio para la conectividad híbrida.',
  'ExpressRoute is a private Layer-3 circuit between your network and Microsoft, provided by a connectivity partner.':
    'ExpressRoute es un circuito privado de capa 3 entre su red y Microsoft, proporcionado por un asociado de conectividad.',
  'For inbound, confirm the public IP, the NSG rule, and backend health.':
    'Para el tráfico de entrada, confirme la IP pública, la regla de NSG y el estado del back-end.',
  'For outbound, confirm an explicit egress method exists (NAT Gateway, load balancer, or firewall).':
    'Para el tráfico de salida, confirme que existe un método de salida explícito (NAT Gateway, equilibrador de carga o firewall).',
  'It gives low-latency, high-bandwidth connectivity between VNets without a gateway, VPN, or public exposure.':
    'Ofrece conectividad de baja latencia y alto ancho de banda entre VNets sin puerta de enlace, VPN ni exposición pública.',
  'It gives predictable latency, higher and more consistent bandwidth, and an SLA, because traffic never touches the public internet.':
    'Ofrece una latencia predecible, un ancho de banda mayor y más constante y un SLA, porque el tráfico nunca pasa por Internet público.',
  'It is the hop where a healthy front end can still fail, because only healthy pool members receive traffic.':
    'Es el salto en el que un front-end correcto todavía puede fallar, porque solo los miembros del grupo en buen estado reciben tráfico.',
  'It is the quickest way to get private hybrid connectivity, with no carrier provisioning lead time.':
    'Es la forma más rápida de obtener conectividad híbrida privada, sin tiempos de aprovisionamiento del operador.',
  'It keeps the traffic on the Microsoft backbone and lets you turn off the service public endpoint entirely.':
    'Mantiene el tráfico en la red troncal de Microsoft y permite desactivar por completo el punto de conexión público del servicio.',
  'It shows a dependency — if this link breaks, the destination becomes unreachable from the source.':
    'Muestra una dependencia: si este vínculo se rompe, el destino deja de ser accesible desde el origen.',
  'On-premises clients need a conditional forwarder or DNS Private Resolver to get the same private answer.':
    'Los clientes locales necesitan un reenviador condicional o DNS Private Resolver para obtener la misma respuesta privada.',
  'Peering is NOT transitive — A-to-B and B-to-C does not give A-to-C without gateway transit or a UDR through an appliance.':
    'El emparejamiento NO es transitivo: tener A-B y B-C no da A-C sin tránsito de puerta de enlace o una UDR a través de una aplicación virtual.',
  'Phase 1 and phase 2 parameters, plus the shared key, must match exactly on both ends.':
    'Los parámetros de fase 1 y fase 2, además de la clave compartida, deben coincidir exactamente en ambos extremos.',
  'Route limits apply — exceeding them drops the session.': 'Se aplican límites de rutas: superarlos hace caer la sesión.',
  'Run the lookup from the client itself and compare it with the expected address.':
    'Ejecute la resolución desde el propio cliente y compárela con la dirección esperada.',
  'This is the least controlled part of the path, and the part most often restricted by an intermediate firewall or proxy.':
    'Es la parte menos controlada de la ruta y la que con más frecuencia restringe un firewall o proxy intermedio.',
  'Throughput and latency depend on the internet path — check for packet loss before blaming Azure.':
    'El rendimiento y la latencia dependen de la ruta de Internet: compruebe si hay pérdida de paquetes antes de culpar a Azure.',
  'UDP 500 and UDP 4500 must be open on the on-premises firewall.':
    'Los puertos UDP 500 y UDP 4500 deben estar abiertos en el firewall local.',
  'VNet peering privately connects two virtual networks so their resources can talk using private IP addresses.':
    'El emparejamiento de VNet conecta de forma privada dos redes virtuales para que sus recursos puedan comunicarse mediante direcciones IP privadas.',
  'Verify the application is listening on the backend port that the rule targets.':
    'Compruebe que la aplicación está escuchando en el puerto de back-end al que apunta la regla.',
};

const pt: Dict = {
  'A DNS query — the client asking what IP address a name maps to.':
    'Uma consulta DNS — o cliente perguntando a qual endereço IP um nome corresponde.',
  'A Private Endpoint connection reaches a PaaS service through a private IP inside your own subnet.':
    'Uma conexão de ponto de extremidade privado alcança um serviço PaaS por meio de um IP privado dentro da sua própria sub-rede.',
  'A Site-to-Site VPN carries traffic inside an encrypted IPsec/IKE tunnel over the public internet.':
    'Uma VPN site a site transporta o tráfego dentro de um túnel IPsec/IKE criptografado pela Internet pública.',
  'A general connection between two components in this design.': 'Uma conexão genérica entre dois componentes deste design.',
  'A public-internet request arriving at, or leaving from, your environment.':
    'Uma solicitação da Internet pública chegando ao seu ambiente ou saindo dele.',
  'Address spaces must not overlap.': 'Os espaços de endereço não podem se sobrepor.',
  'Backend-pool traffic — the load balancer or gateway forwarding a request to a member instance.':
    'Tráfego do pool de back-end — o balanceador de carga ou gateway encaminhando uma solicitação para uma instância membro.',
  'Both peering links must show Connected; a one-sided peering does not pass traffic.':
    'Os dois links de emparelhamento precisam aparecer como Conectado; um emparelhamento de um lado só não passa tráfego.',
  'Cached answers persist past a fix — flush the cache before retesting.':
    'Respostas em cache permanecem mesmo após a correção — limpe o cache antes de testar novamente.',
  'Check BGP session state and the received route count on both the primary and secondary link.':
    'Verifique o estado da sessão BGP e a contagem de rotas recebidas no link primário e no secundário.',
  'Check that UDP AND TCP port 53 are permitted end to end.':
    'Verifique se a porta 53 é permitida de ponta a ponta em UDP E em TCP.',
  'Check the health probe result for every pool member.':
    'Verifique o resultado do teste de integridade de cada membro do pool.',
  'Check whether a corporate proxy or TLS-inspection device sits in the path.':
    'Verifique se há um proxy corporativo ou dispositivo de inspeção TLS no caminho.',
  'Confirm no NSG or firewall rule denies the specific port in use.':
    'Confirme que nenhuma regra de NSG ou de firewall nega a porta específica em uso.',
  'Confirm the NSG on the backend allows the probe source and the data port.':
    'Confirme que o NSG do back-end permite a origem do teste de integridade e a porta de dados.',
  'Confirm the relevant privatelink DNS zone is linked to the client VNet.':
    'Confirme que a zona DNS privatelink correspondente está vinculada à VNet do cliente.',
  'Confirm the route from source to destination with Network Watcher next hop.':
    'Confirme a rota da origem até o destino com o próximo salto do Network Watcher.',
  'Confirm the traffic selectors or Local Network Gateway prefixes include the specific subnets in this flow.':
    'Confirme que os seletores de tráfego ou os prefixos do gateway de rede local incluem as sub-redes específicas deste fluxo.',
  'Confirm which DNS server the client is actually using.': 'Confirme qual servidor DNS o cliente está realmente usando.',
  'Confirm which peering the flow uses: private peering for VNets, Microsoft peering for Microsoft public services.':
    'Confirme qual emparelhamento o fluxo usa: emparelhamento privado para VNets e emparelhamento da Microsoft para serviços públicos da Microsoft.',
  'DNS decides where the traffic goes. A wrong answer sends an otherwise perfect network path to the wrong destination.':
    'O DNS decide para onde o tráfego vai. Uma resposta errada envia um caminho de rede perfeito para o destino errado.',
  'DNS must resolve the service hostname to the private IP — this is the most common failure by a wide margin.':
    'O DNS precisa resolver o nome do host do serviço para o IP privado — essa é, de longe, a falha mais comum.',
  'Enable "Allow gateway transit" on the hub and "Use remote gateway" on the spoke for hybrid connectivity.':
    'Habilite "Permitir trânsito de gateway" no hub e "Usar gateway remoto" no spoke para conectividade híbrida.',
  'ExpressRoute is a private Layer-3 circuit between your network and Microsoft, provided by a connectivity partner.':
    'O ExpressRoute é um circuito privado de camada 3 entre a sua rede e a Microsoft, fornecido por um parceiro de conectividade.',
  'For inbound, confirm the public IP, the NSG rule, and backend health.':
    'Para o tráfego de entrada, confirme o IP público, a regra de NSG e a integridade do back-end.',
  'For outbound, confirm an explicit egress method exists (NAT Gateway, load balancer, or firewall).':
    'Para o tráfego de saída, confirme que existe um método de saída explícito (NAT Gateway, balanceador de carga ou firewall).',
  'It gives low-latency, high-bandwidth connectivity between VNets without a gateway, VPN, or public exposure.':
    'Ele oferece conectividade de baixa latência e alta largura de banda entre VNets, sem gateway, VPN ou exposição pública.',
  'It gives predictable latency, higher and more consistent bandwidth, and an SLA, because traffic never touches the public internet.':
    'Ele oferece latência previsível, largura de banda maior e mais consistente e um SLA, porque o tráfego nunca passa pela Internet pública.',
  'It is the hop where a healthy front end can still fail, because only healthy pool members receive traffic.':
    'É o salto em que um front-end saudável ainda pode falhar, porque somente membros íntegros do pool recebem tráfego.',
  'It is the quickest way to get private hybrid connectivity, with no carrier provisioning lead time.':
    'É a maneira mais rápida de obter conectividade híbrida privada, sem o prazo de provisionamento da operadora.',
  'It keeps the traffic on the Microsoft backbone and lets you turn off the service public endpoint entirely.':
    'Ele mantém o tráfego no backbone da Microsoft e permite desativar totalmente o ponto de extremidade público do serviço.',
  'It shows a dependency — if this link breaks, the destination becomes unreachable from the source.':
    'Ele mostra uma dependência — se esse link falhar, o destino se torna inacessível a partir da origem.',
  'On-premises clients need a conditional forwarder or DNS Private Resolver to get the same private answer.':
    'Clientes locais precisam de um encaminhador condicional ou do DNS Private Resolver para obter a mesma resposta privada.',
  'Peering is NOT transitive — A-to-B and B-to-C does not give A-to-C without gateway transit or a UDR through an appliance.':
    'O emparelhamento NÃO é transitivo — ter A-B e B-C não dá A-C sem trânsito de gateway ou uma UDR passando por um appliance.',
  'Phase 1 and phase 2 parameters, plus the shared key, must match exactly on both ends.':
    'Os parâmetros de fase 1 e fase 2, além da chave compartilhada, precisam ser exatamente iguais nas duas pontas.',
  'Route limits apply — exceeding them drops the session.': 'Há limites de rotas — excedê-los derruba a sessão.',
  'Run the lookup from the client itself and compare it with the expected address.':
    'Execute a resolução a partir do próprio cliente e compare com o endereço esperado.',
  'This is the least controlled part of the path, and the part most often restricted by an intermediate firewall or proxy.':
    'Esta é a parte menos controlada do caminho e a que é mais frequentemente restringida por um firewall ou proxy intermediário.',
  'Throughput and latency depend on the internet path — check for packet loss before blaming Azure.':
    'A taxa de transferência e a latência dependem do caminho da Internet — verifique se há perda de pacotes antes de culpar o Azure.',
  'UDP 500 and UDP 4500 must be open on the on-premises firewall.':
    'As portas UDP 500 e UDP 4500 precisam estar abertas no firewall local.',
  'VNet peering privately connects two virtual networks so their resources can talk using private IP addresses.':
    'O emparelhamento de VNet conecta de forma privada duas redes virtuais para que seus recursos possam se comunicar usando endereços IP privados.',
  'Verify the application is listening on the backend port that the rule targets.':
    'Verifique se o aplicativo está escutando na porta de back-end para a qual a regra aponta.',
};

const fr: Dict = {
  'A DNS query — the client asking what IP address a name maps to.':
    'Une requête DNS : le client demande à quelle adresse IP correspond un nom.',
  'A Private Endpoint connection reaches a PaaS service through a private IP inside your own subnet.':
    'Une connexion par point de terminaison privé atteint un service PaaS via une adresse IP privée située dans votre propre sous-réseau.',
  'A Site-to-Site VPN carries traffic inside an encrypted IPsec/IKE tunnel over the public internet.':
    'Un VPN site à site transporte le trafic dans un tunnel IPsec/IKE chiffré sur Internet public.',
  'A general connection between two components in this design.': 'Une connexion générique entre deux composants de cette conception.',
  'A public-internet request arriving at, or leaving from, your environment.':
    'Une requête depuis Internet public entrant dans votre environnement ou en sortant.',
  'Address spaces must not overlap.': 'Les espaces d’adressage ne doivent pas se chevaucher.',
  'Backend-pool traffic — the load balancer or gateway forwarding a request to a member instance.':
    'Trafic de pool principal : l’équilibreur de charge ou la passerelle transfère une requête vers une instance membre.',
  'Both peering links must show Connected; a one-sided peering does not pass traffic.':
    'Les deux liens de peering doivent afficher Connecté ; un peering unilatéral ne laisse pas passer le trafic.',
  'Cached answers persist past a fix — flush the cache before retesting.':
    'Les réponses en cache subsistent après une correction — videz le cache avant de retester.',
  'Check BGP session state and the received route count on both the primary and secondary link.':
    'Vérifiez l’état de la session BGP et le nombre d’itinéraires reçus sur le lien principal comme sur le secondaire.',
  'Check that UDP AND TCP port 53 are permitted end to end.':
    'Vérifiez que le port 53 est autorisé de bout en bout en UDP ET en TCP.',
  'Check the health probe result for every pool member.':
    'Vérifiez le résultat de la sonde d’intégrité pour chaque membre du pool.',
  'Check whether a corporate proxy or TLS-inspection device sits in the path.':
    'Vérifiez si un proxy d’entreprise ou un équipement d’inspection TLS se trouve sur le chemin.',
  'Confirm no NSG or firewall rule denies the specific port in use.':
    'Confirmez qu’aucune règle de groupe de sécurité réseau ni de pare-feu ne refuse le port précis utilisé.',
  'Confirm the NSG on the backend allows the probe source and the data port.':
    'Confirmez que le groupe de sécurité réseau du back-end autorise la source de la sonde et le port de données.',
  'Confirm the relevant privatelink DNS zone is linked to the client VNet.':
    'Confirmez que la zone DNS privatelink concernée est liée au réseau virtuel du client.',
  'Confirm the route from source to destination with Network Watcher next hop.':
    'Confirmez l’itinéraire de la source vers la destination avec le tronçon suivant de Network Watcher.',
  'Confirm the traffic selectors or Local Network Gateway prefixes include the specific subnets in this flow.':
    'Confirmez que les sélecteurs de trafic ou les préfixes de la passerelle de réseau local incluent les sous-réseaux précis de ce flux.',
  'Confirm which DNS server the client is actually using.': 'Confirmez quel serveur DNS le client utilise réellement.',
  'Confirm which peering the flow uses: private peering for VNets, Microsoft peering for Microsoft public services.':
    'Confirmez quel peering le flux emprunte : peering privé pour les réseaux virtuels, peering Microsoft pour les services publics Microsoft.',
  'DNS decides where the traffic goes. A wrong answer sends an otherwise perfect network path to the wrong destination.':
    'Le DNS décide où va le trafic. Une mauvaise réponse envoie un chemin réseau par ailleurs parfait vers la mauvaise destination.',
  'DNS must resolve the service hostname to the private IP — this is the most common failure by a wide margin.':
    'Le DNS doit résoudre le nom d’hôte du service vers l’adresse IP privée — c’est de loin la panne la plus fréquente.',
  'Enable "Allow gateway transit" on the hub and "Use remote gateway" on the spoke for hybrid connectivity.':
    'Activez « Autoriser le transit par la passerelle » sur le hub et « Utiliser la passerelle distante » sur le spoke pour la connectivité hybride.',
  'ExpressRoute is a private Layer-3 circuit between your network and Microsoft, provided by a connectivity partner.':
    'ExpressRoute est un circuit privé de couche 3 entre votre réseau et Microsoft, fourni par un partenaire de connectivité.',
  'For inbound, confirm the public IP, the NSG rule, and backend health.':
    'Pour le trafic entrant, confirmez l’adresse IP publique, la règle de groupe de sécurité réseau et l’intégrité du back-end.',
  'For outbound, confirm an explicit egress method exists (NAT Gateway, load balancer, or firewall).':
    'Pour le trafic sortant, confirmez qu’une méthode de sortie explicite existe (NAT Gateway, équilibreur de charge ou pare-feu).',
  'It gives low-latency, high-bandwidth connectivity between VNets without a gateway, VPN, or public exposure.':
    'Il offre une connectivité à faible latence et haut débit entre réseaux virtuels, sans passerelle, VPN ni exposition publique.',
  'It gives predictable latency, higher and more consistent bandwidth, and an SLA, because traffic never touches the public internet.':
    'Il offre une latence prévisible, une bande passante plus élevée et plus régulière ainsi qu’un SLA, car le trafic ne passe jamais par Internet public.',
  'It is the hop where a healthy front end can still fail, because only healthy pool members receive traffic.':
    'C’est le tronçon où un front-end sain peut malgré tout échouer, car seuls les membres sains du pool reçoivent du trafic.',
  'It is the quickest way to get private hybrid connectivity, with no carrier provisioning lead time.':
    'C’est le moyen le plus rapide d’obtenir une connectivité hybride privée, sans délai d’approvisionnement chez l’opérateur.',
  'It keeps the traffic on the Microsoft backbone and lets you turn off the service public endpoint entirely.':
    'Il maintient le trafic sur le backbone Microsoft et permet de désactiver totalement le point de terminaison public du service.',
  'It shows a dependency — if this link breaks, the destination becomes unreachable from the source.':
    'Elle indique une dépendance : si ce lien tombe, la destination devient inaccessible depuis la source.',
  'On-premises clients need a conditional forwarder or DNS Private Resolver to get the same private answer.':
    'Les clients locaux ont besoin d’un redirecteur conditionnel ou de DNS Private Resolver pour obtenir la même réponse privée.',
  'Peering is NOT transitive — A-to-B and B-to-C does not give A-to-C without gateway transit or a UDR through an appliance.':
    'Le peering n’est PAS transitif : A-B et B-C ne donnent pas A-C sans transit par passerelle ou itinéraire défini par l’utilisateur via un appareil virtuel.',
  'Phase 1 and phase 2 parameters, plus the shared key, must match exactly on both ends.':
    'Les paramètres de phase 1 et de phase 2, ainsi que la clé partagée, doivent correspondre exactement aux deux extrémités.',
  'Route limits apply — exceeding them drops the session.': 'Des limites d’itinéraires s’appliquent — les dépasser fait tomber la session.',
  'Run the lookup from the client itself and compare it with the expected address.':
    'Exécutez la résolution depuis le client lui-même et comparez-la à l’adresse attendue.',
  'This is the least controlled part of the path, and the part most often restricted by an intermediate firewall or proxy.':
    'C’est la partie la moins maîtrisée du chemin, et celle qui est le plus souvent restreinte par un pare-feu ou un proxy intermédiaire.',
  'Throughput and latency depend on the internet path — check for packet loss before blaming Azure.':
    'Le débit et la latence dépendent du chemin Internet — vérifiez la perte de paquets avant d’incriminer Azure.',
  'UDP 500 and UDP 4500 must be open on the on-premises firewall.':
    'Les ports UDP 500 et UDP 4500 doivent être ouverts sur le pare-feu local.',
  'VNet peering privately connects two virtual networks so their resources can talk using private IP addresses.':
    'Le peering de réseaux virtuels connecte de façon privée deux réseaux virtuels afin que leurs ressources puissent communiquer via des adresses IP privées.',
  'Verify the application is listening on the backend port that the rule targets.':
    'Vérifiez que l’application écoute sur le port back-end ciblé par la règle.',
};

const de: Dict = {
  'A DNS query — the client asking what IP address a name maps to.':
    'Eine DNS-Abfrage — der Client fragt, welcher IP-Adresse ein Name zugeordnet ist.',
  'A Private Endpoint connection reaches a PaaS service through a private IP inside your own subnet.':
    'Eine Verbindung über einen privaten Endpunkt erreicht einen PaaS-Dienst über eine private IP-Adresse in Ihrem eigenen Subnetz.',
  'A Site-to-Site VPN carries traffic inside an encrypted IPsec/IKE tunnel over the public internet.':
    'Ein Site-to-Site-VPN transportiert Datenverkehr in einem verschlüsselten IPsec/IKE-Tunnel über das öffentliche Internet.',
  'A general connection between two components in this design.': 'Eine allgemeine Verbindung zwischen zwei Komponenten dieses Designs.',
  'A public-internet request arriving at, or leaving from, your environment.':
    'Eine Anforderung aus dem öffentlichen Internet, die Ihre Umgebung erreicht oder verlässt.',
  'Address spaces must not overlap.': 'Adressräume dürfen sich nicht überschneiden.',
  'Backend-pool traffic — the load balancer or gateway forwarding a request to a member instance.':
    'Back-End-Pool-Datenverkehr — der Load Balancer oder das Gateway leitet eine Anforderung an eine Mitgliedsinstanz weiter.',
  'Both peering links must show Connected; a one-sided peering does not pass traffic.':
    'Beide Peeringverbindungen müssen den Status „Verbunden“ zeigen; ein einseitiges Peering leitet keinen Datenverkehr weiter.',
  'Cached answers persist past a fix — flush the cache before retesting.':
    'Zwischengespeicherte Antworten bleiben auch nach einer Korrektur bestehen — leeren Sie den Cache vor dem erneuten Test.',
  'Check BGP session state and the received route count on both the primary and secondary link.':
    'Prüfen Sie den BGP-Sitzungsstatus und die Anzahl empfangener Routen auf der primären und der sekundären Verbindung.',
  'Check that UDP AND TCP port 53 are permitted end to end.':
    'Prüfen Sie, ob Port 53 durchgängig sowohl über UDP ALS AUCH über TCP zugelassen ist.',
  'Check the health probe result for every pool member.':
    'Prüfen Sie das Ergebnis des Integritätstests für jedes Poolmitglied.',
  'Check whether a corporate proxy or TLS-inspection device sits in the path.':
    'Prüfen Sie, ob sich ein Unternehmensproxy oder ein Gerät zur TLS-Überprüfung im Pfad befindet.',
  'Confirm no NSG or firewall rule denies the specific port in use.':
    'Stellen Sie sicher, dass keine NSG- oder Firewallregel den konkret verwendeten Port verweigert.',
  'Confirm the NSG on the backend allows the probe source and the data port.':
    'Stellen Sie sicher, dass die NSG am Back-End die Quelle des Integritätstests und den Datenport zulässt.',
  'Confirm the relevant privatelink DNS zone is linked to the client VNet.':
    'Stellen Sie sicher, dass die entsprechende privatelink-DNS-Zone mit dem VNet des Clients verknüpft ist.',
  'Confirm the route from source to destination with Network Watcher next hop.':
    'Bestätigen Sie die Route von der Quelle zum Ziel mit dem nächsten Hop in Network Watcher.',
  'Confirm the traffic selectors or Local Network Gateway prefixes include the specific subnets in this flow.':
    'Stellen Sie sicher, dass die Datenverkehrsselektoren bzw. die Präfixe des lokalen Netzwerkgateways die konkreten Subnetze dieses Flows enthalten.',
  'Confirm which DNS server the client is actually using.': 'Stellen Sie fest, welchen DNS-Server der Client tatsächlich verwendet.',
  'Confirm which peering the flow uses: private peering for VNets, Microsoft peering for Microsoft public services.':
    'Stellen Sie fest, welches Peering der Flow nutzt: privates Peering für VNets, Microsoft-Peering für öffentliche Microsoft-Dienste.',
  'DNS decides where the traffic goes. A wrong answer sends an otherwise perfect network path to the wrong destination.':
    'DNS entscheidet, wohin der Datenverkehr geht. Eine falsche Antwort schickt einen ansonsten einwandfreien Netzwerkpfad zum falschen Ziel.',
  'DNS must resolve the service hostname to the private IP — this is the most common failure by a wide margin.':
    'DNS muss den Hostnamen des Diensts in die private IP-Adresse auflösen — das ist mit Abstand die häufigste Fehlerursache.',
  'Enable "Allow gateway transit" on the hub and "Use remote gateway" on the spoke for hybrid connectivity.':
    'Aktivieren Sie für hybride Konnektivität „Gatewaytransit zulassen“ im Hub und „Remotegateway verwenden“ im Spoke.',
  'ExpressRoute is a private Layer-3 circuit between your network and Microsoft, provided by a connectivity partner.':
    'ExpressRoute ist eine private Layer-3-Leitung zwischen Ihrem Netzwerk und Microsoft, bereitgestellt von einem Konnektivitätspartner.',
  'For inbound, confirm the public IP, the NSG rule, and backend health.':
    'Prüfen Sie eingehend die öffentliche IP-Adresse, die NSG-Regel und die Back-End-Integrität.',
  'For outbound, confirm an explicit egress method exists (NAT Gateway, load balancer, or firewall).':
    'Prüfen Sie ausgehend, ob eine explizite Ausgangsmethode vorhanden ist (NAT Gateway, Load Balancer oder Firewall).',
  'It gives low-latency, high-bandwidth connectivity between VNets without a gateway, VPN, or public exposure.':
    'Es bietet Konnektivität zwischen VNets mit geringer Latenz und hoher Bandbreite, ohne Gateway, VPN oder öffentliche Exposition.',
  'It gives predictable latency, higher and more consistent bandwidth, and an SLA, because traffic never touches the public internet.':
    'Es bietet vorhersehbare Latenz, höhere und gleichmäßigere Bandbreite sowie eine SLA, da der Datenverkehr nie das öffentliche Internet berührt.',
  'It is the hop where a healthy front end can still fail, because only healthy pool members receive traffic.':
    'Es ist der Hop, an dem ein fehlerfreies Front-End trotzdem scheitern kann, denn nur fehlerfreie Poolmitglieder erhalten Datenverkehr.',
  'It is the quickest way to get private hybrid connectivity, with no carrier provisioning lead time.':
    'Es ist der schnellste Weg zu privater hybrider Konnektivität, ohne Vorlaufzeit für die Bereitstellung durch den Carrier.',
  'It keeps the traffic on the Microsoft backbone and lets you turn off the service public endpoint entirely.':
    'Der Datenverkehr bleibt im Microsoft-Backbone, und der öffentliche Endpunkt des Diensts lässt sich vollständig deaktivieren.',
  'It shows a dependency — if this link breaks, the destination becomes unreachable from the source.':
    'Sie zeigt eine Abhängigkeit — fällt diese Verbindung aus, ist das Ziel von der Quelle aus nicht mehr erreichbar.',
  'On-premises clients need a conditional forwarder or DNS Private Resolver to get the same private answer.':
    'Lokale Clients benötigen einen bedingten Weiterleitungsserver oder DNS Private Resolver, um dieselbe private Antwort zu erhalten.',
  'Peering is NOT transitive — A-to-B and B-to-C does not give A-to-C without gateway transit or a UDR through an appliance.':
    'Peering ist NICHT transitiv — A-zu-B und B-zu-C ergibt kein A-zu-C ohne Gatewaytransit oder eine benutzerdefinierte Route über eine Appliance.',
  'Phase 1 and phase 2 parameters, plus the shared key, must match exactly on both ends.':
    'Die Parameter von Phase 1 und Phase 2 sowie der gemeinsame Schlüssel müssen auf beiden Seiten exakt übereinstimmen.',
  'Route limits apply — exceeding them drops the session.': 'Es gelten Routenlimits — werden sie überschritten, bricht die Sitzung ab.',
  'Run the lookup from the client itself and compare it with the expected address.':
    'Führen Sie die Namensauflösung direkt auf dem Client aus und vergleichen Sie sie mit der erwarteten Adresse.',
  'This is the least controlled part of the path, and the part most often restricted by an intermediate firewall or proxy.':
    'Dies ist der am wenigsten kontrollierte Teil des Pfads und derjenige, der am häufigsten durch eine zwischengeschaltete Firewall oder einen Proxy eingeschränkt wird.',
  'Throughput and latency depend on the internet path — check for packet loss before blaming Azure.':
    'Durchsatz und Latenz hängen vom Internetpfad ab — prüfen Sie auf Paketverlust, bevor Sie Azure verantwortlich machen.',
  'UDP 500 and UDP 4500 must be open on the on-premises firewall.':
    'UDP 500 und UDP 4500 müssen auf der lokalen Firewall geöffnet sein.',
  'VNet peering privately connects two virtual networks so their resources can talk using private IP addresses.':
    'VNet-Peering verbindet zwei virtuelle Netzwerke privat, sodass ihre Ressourcen über private IP-Adressen kommunizieren können.',
  'Verify the application is listening on the backend port that the rule targets.':
    'Prüfen Sie, ob die Anwendung an dem Back-End-Port lauscht, auf den die Regel verweist.',
};

const ko: Dict = {
  'A DNS query — the client asking what IP address a name maps to.':
    'DNS 쿼리 — 클라이언트가 어떤 이름이 어떤 IP 주소에 매핑되는지 묻는 과정입니다.',
  'A Private Endpoint connection reaches a PaaS service through a private IP inside your own subnet.':
    '프라이빗 엔드포인트 연결은 사용자 서브넷 내부의 프라이빗 IP를 통해 PaaS 서비스에 접근합니다.',
  'A Site-to-Site VPN carries traffic inside an encrypted IPsec/IKE tunnel over the public internet.':
    '사이트 간 VPN은 공용 인터넷을 통해 암호화된 IPsec/IKE 터널 안으로 트래픽을 전달합니다.',
  'A general connection between two components in this design.': '이 설계에서 두 구성 요소를 잇는 일반 연결입니다.',
  'A public-internet request arriving at, or leaving from, your environment.':
    '사용자 환경으로 들어오거나 환경에서 나가는 공용 인터넷 요청입니다.',
  'Address spaces must not overlap.': '주소 공간이 겹치면 안 됩니다.',
  'Backend-pool traffic — the load balancer or gateway forwarding a request to a member instance.':
    '백 엔드 풀 트래픽 — 부하 분산 장치나 게이트웨이가 요청을 멤버 인스턴스로 전달합니다.',
  'Both peering links must show Connected; a one-sided peering does not pass traffic.':
    '양쪽 피어링 링크가 모두 연결됨 상태여야 합니다. 한쪽만 설정된 피어링은 트래픽을 전달하지 않습니다.',
  'Cached answers persist past a fix — flush the cache before retesting.':
    '캐시된 응답은 문제를 수정한 뒤에도 남아 있습니다. 다시 테스트하기 전에 캐시를 비우세요.',
  'Check BGP session state and the received route count on both the primary and secondary link.':
    '기본 링크와 보조 링크 모두에서 BGP 세션 상태와 수신된 경로 수를 확인하세요.',
  'Check that UDP AND TCP port 53 are permitted end to end.':
    '53번 포트가 UDP와 TCP 모두 종단 간으로 허용되는지 확인하세요.',
  'Check the health probe result for every pool member.': '모든 풀 멤버의 상태 프로브 결과를 확인하세요.',
  'Check whether a corporate proxy or TLS-inspection device sits in the path.':
    '경로에 회사 프록시나 TLS 검사 장비가 있는지 확인하세요.',
  'Confirm no NSG or firewall rule denies the specific port in use.':
    '사용 중인 특정 포트를 거부하는 NSG나 방화벽 규칙이 없는지 확인하세요.',
  'Confirm the NSG on the backend allows the probe source and the data port.':
    '백 엔드의 NSG가 프로브 원본과 데이터 포트를 허용하는지 확인하세요.',
  'Confirm the relevant privatelink DNS zone is linked to the client VNet.':
    '해당 privatelink DNS 영역이 클라이언트 VNet에 연결되어 있는지 확인하세요.',
  'Confirm the route from source to destination with Network Watcher next hop.':
    'Network Watcher의 다음 홉으로 원본에서 대상까지의 경로를 확인하세요.',
  'Confirm the traffic selectors or Local Network Gateway prefixes include the specific subnets in this flow.':
    '트래픽 선택기 또는 로컬 네트워크 게이트웨이 접두사에 이 흐름의 해당 서브넷이 포함되어 있는지 확인하세요.',
  'Confirm which DNS server the client is actually using.': '클라이언트가 실제로 사용하는 DNS 서버를 확인하세요.',
  'Confirm which peering the flow uses: private peering for VNets, Microsoft peering for Microsoft public services.':
    '흐름이 어떤 피어링을 사용하는지 확인하세요. VNet에는 프라이빗 피어링을, Microsoft 공용 서비스에는 Microsoft 피어링을 사용합니다.',
  'DNS decides where the traffic goes. A wrong answer sends an otherwise perfect network path to the wrong destination.':
    'DNS가 트래픽의 목적지를 결정합니다. 잘못된 응답 하나면 완벽한 네트워크 경로도 엉뚱한 대상으로 향하게 됩니다.',
  'DNS must resolve the service hostname to the private IP — this is the most common failure by a wide margin.':
    'DNS가 서비스 호스트 이름을 프라이빗 IP로 확인해야 합니다. 이것이 압도적으로 가장 흔한 장애 원인입니다.',
  'Enable "Allow gateway transit" on the hub and "Use remote gateway" on the spoke for hybrid connectivity.':
    '하이브리드 연결을 위해 허브에서 "게이트웨이 전송 허용"을, 스포크에서 "원격 게이트웨이 사용"을 켜세요.',
  'ExpressRoute is a private Layer-3 circuit between your network and Microsoft, provided by a connectivity partner.':
    'ExpressRoute는 연결 파트너가 제공하는, 사용자 네트워크와 Microsoft 사이의 프라이빗 계층 3 회선입니다.',
  'For inbound, confirm the public IP, the NSG rule, and backend health.':
    '인바운드의 경우 공용 IP, NSG 규칙, 백 엔드 상태를 확인하세요.',
  'For outbound, confirm an explicit egress method exists (NAT Gateway, load balancer, or firewall).':
    '아웃바운드의 경우 명시적인 송신 방법(NAT Gateway, 부하 분산 장치 또는 방화벽)이 있는지 확인하세요.',
  'It gives low-latency, high-bandwidth connectivity between VNets without a gateway, VPN, or public exposure.':
    '게이트웨이나 VPN, 공용 노출 없이 VNet 간에 짧은 대기 시간과 높은 대역폭의 연결을 제공합니다.',
  'It gives predictable latency, higher and more consistent bandwidth, and an SLA, because traffic never touches the public internet.':
    '트래픽이 공용 인터넷을 전혀 거치지 않으므로 예측 가능한 대기 시간, 더 높고 일정한 대역폭, 그리고 SLA를 제공합니다.',
  'It is the hop where a healthy front end can still fail, because only healthy pool members receive traffic.':
    '정상 상태인 풀 멤버만 트래픽을 받기 때문에, 프런트 엔드가 정상이어도 실패할 수 있는 홉입니다.',
  'It is the quickest way to get private hybrid connectivity, with no carrier provisioning lead time.':
    '통신 사업자의 프로비저닝 대기 시간 없이 프라이빗 하이브리드 연결을 가장 빠르게 구성하는 방법입니다.',
  'It keeps the traffic on the Microsoft backbone and lets you turn off the service public endpoint entirely.':
    '트래픽을 Microsoft 백본에 유지하며, 서비스의 공용 엔드포인트를 완전히 끌 수 있게 해 줍니다.',
  'It shows a dependency — if this link breaks, the destination becomes unreachable from the source.':
    '종속 관계를 나타냅니다. 이 링크가 끊기면 원본에서 대상에 도달할 수 없게 됩니다.',
  'On-premises clients need a conditional forwarder or DNS Private Resolver to get the same private answer.':
    '온-프레미스 클라이언트가 동일한 프라이빗 응답을 받으려면 조건부 전달자나 DNS Private Resolver가 필요합니다.',
  'Peering is NOT transitive — A-to-B and B-to-C does not give A-to-C without gateway transit or a UDR through an appliance.':
    '피어링은 전이되지 않습니다. A-B와 B-C가 있어도 게이트웨이 전송이나 어플라이언스를 경유하는 UDR 없이는 A-C가 되지 않습니다.',
  'Phase 1 and phase 2 parameters, plus the shared key, must match exactly on both ends.':
    '1단계와 2단계 매개 변수, 그리고 공유 키가 양쪽 끝에서 정확히 일치해야 합니다.',
  'Route limits apply — exceeding them drops the session.': '경로 수 제한이 적용되며, 초과하면 세션이 끊깁니다.',
  'Run the lookup from the client itself and compare it with the expected address.':
    '클라이언트에서 직접 이름 확인을 실행해 예상 주소와 비교하세요.',
  'This is the least controlled part of the path, and the part most often restricted by an intermediate firewall or proxy.':
    '경로에서 통제력이 가장 약한 구간이며, 중간 방화벽이나 프록시에 의해 가장 자주 차단되는 구간입니다.',
  'Throughput and latency depend on the internet path — check for packet loss before blaming Azure.':
    '처리량과 대기 시간은 인터넷 경로에 좌우됩니다. Azure를 탓하기 전에 패킷 손실 여부를 확인하세요.',
  'UDP 500 and UDP 4500 must be open on the on-premises firewall.':
    '온-프레미스 방화벽에서 UDP 500과 UDP 4500이 열려 있어야 합니다.',
  'VNet peering privately connects two virtual networks so their resources can talk using private IP addresses.':
    'VNet 피어링은 두 가상 네트워크를 프라이빗하게 연결해, 각 리소스가 프라이빗 IP 주소로 통신할 수 있게 합니다.',
  'Verify the application is listening on the backend port that the rule targets.':
    '규칙이 대상으로 지정한 백 엔드 포트에서 애플리케이션이 수신 대기 중인지 확인하세요.',
};

export const EDGE_KNOWLEDGE_DICT: Record<Exclude<LangCode, 'en'>, Dict> = {
  ja,
  zh,
  es,
  pt,
  fr,
  de,
  ko,
};
