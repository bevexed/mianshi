# Kubernetes 高频面试题

面向中高级前端、Node.js 与全栈岗位：先说 Kubernetes 管理什么对象，再解释控制器如何把实际状态收敛到期望状态，最后落到流量、资源、发布和故障恢复。回答不要把 Kubernetes 说成“自动解决一切”的平台；应用仍需正确处理状态、幂等、优雅停机、可观测性和容量边界。

## 一、核心概念与架构

### 1. Kubernetes 解决什么问题？它和 Docker 是什么关系？

**结论：Docker 等容器运行时负责构建或运行容器；Kubernetes 负责在集群中声明、调度和持续管理容器化工作负载。** 它主要解决多节点调度、副本维持、服务发现、滚动发布、配置注入、资源治理和故障后的重新调度。

Kubernetes 不负责把有状态业务自动变成无状态，也不能替代数据库备份、业务幂等、监控告警和容量规划。单机、少量服务且发布简单时，Compose 可能更合适；副本、节点、发布策略和故障迁移复杂后，编排平台的价值才明显。先复习 [Docker 高频面试题](Docker高频面试题.md)。

### 2. Kubernetes 集群的核心组件有哪些？

**结论：控制面保存并协调集群期望状态，节点组件负责真正运行 Pod。**

- `kube-apiserver`：所有核心 API 的入口，负责认证、授权、准入和资源读写入口。
- `etcd`：保存 API Server 数据的高可用一致性键值存储；其备份和恢复是集群灾备重点。
- `kube-scheduler`：为尚未绑定节点的 Pod 选择合适节点。
- `kube-controller-manager`：运行 Deployment、Node 等控制器，持续执行状态协调。
- `kubelet`：节点代理，根据 PodSpec 管理本节点 Pod 和探针。
- 容器运行时：按照 CRI 相关接口运行容器。
- `kube-proxy` 是常见的 Service 数据面实现，但它是可选组件，部分网络方案会用自己的实现替代。

完整组件职责见 [Kubernetes Components](https://kubernetes.io/docs/concepts/overview/components/)。

### 3. 什么是“声明式 API”和“控制循环”？

**结论：用户提交期望状态，控制器持续观察实际状态，并通过创建、更新或删除资源让两者逐步收敛。** 例如 Deployment 声明 3 个副本，某个 Pod 消失后，控制器会创建替代 Pod，而不是要求用户手动执行“再启动一个”。

这种协调通常是异步、最终收敛的，不等于一次 API 请求后所有组件立即完成。排障时要分别看对象 `spec`、`status`、conditions 和 Events，不能只看 `kubectl apply` 返回成功。

### 4. Pod 和容器是什么关系？为什么 Kubernetes 不直接管理单个容器？

**结论：Pod 是 Kubernetes 可调度的最小单元，一个 Pod 可包含一个或多个共享网络和部分存储的容器。** 同一 Pod 内的容器共享网络 namespace，可以通过 `localhost` 通信，但各自仍有独立进程和文件系统视图。

只有生命周期、调度和资源关系非常紧密的容器才应放在同一 Pod，例如应用与必要的 sidecar。普通微服务不应为了“通信方便”塞进同一 Pod，否则会把扩缩容、发布和故障边界耦合在一起。

### 5. label、selector 和 annotation 分别做什么？

**结论：label 是用于标识、筛选和关联对象的键值；selector 根据 label 选择对象；annotation 保存不用于选择的扩展元数据。** Deployment、Service 和 NetworkPolicy 都依赖 selector，因此标签约定是控制器正确关联资源的基础。

常见事故是 Service selector 与 Pod label 不一致，导致 Service 没有 EndpointSlice 后端。不要随意修改控制器 selector；它可能有不可变约束，也可能让旧、新 Pod 的归属关系发生变化。

### 6. Namespace 能提供什么隔离？

**结论：Namespace 为名称、权限、配额和策略提供逻辑边界，但不是天然的强安全或网络隔离。** 不同 Namespace 可以分别配置 RBAC、ResourceQuota、LimitRange、NetworkPolicy 和 Pod Security 标准。

要形成租户隔离，需要把这些控制组合起来，并考虑节点、存储、Secret、日志和集群级资源。只把工作负载放进不同 Namespace，不会自动阻止它们互相访问。

## 二、工作负载与发布

### 7. Pod、ReplicaSet 和 Deployment 有什么关系？

**结论：Pod 承载容器；ReplicaSet 维持一组匹配 Pod 的副本数；Deployment 管理 ReplicaSet，并提供声明式更新和回滚能力。** 日常无状态服务通常操作 Deployment，而不是直接创建 ReplicaSet 或裸 Pod。

删除某个 Deployment 管理的 Pod 后，ReplicaSet 会补副本；删除 Deployment 的影响则取决于删除传播策略。生产排障前先查看 `ownerReferences`，避免修错层级。

#### 场景追问：三个 NestJS Pod 的部署、访问与故障恢复

**面试官：** 三副本 NestJS 的一个实例崩溃会怎样？为什么常用 Service？三种 Service 类型有什么区别？

**口语参考答案：**

> Pod 是最小部署单元，包含共享网络等资源的一个或多个容器。Deployment 通过 ReplicaSet 管理副本和滚动更新，Service 给一组匹配的 Pod 提供稳定服务发现与流量入口。容器崩溃时 kubelet 按策略重启容器；受控制器管理的 Pod 需要替换时，控制器补齐副本，新 Pod IP 可能不同。ClusterIP 主要供集群内部访问，NodePort 通过节点端口暴露，LoadBalancer 对接环境中的负载均衡实现。

**追问与易错点：** 容器重启、Pod 替换和跨节点重新调度不同。Pod IP 可以直接访问，但调用方需要自己处理其变化和发现；LoadBalancer 是否可用取决于基础设施。

### 8. Deployment 的滚动更新和回滚是怎么工作的？

**结论：`RollingUpdate` 会逐步扩容新 ReplicaSet、缩容旧 ReplicaSet；`maxSurge` 控制期望副本数之外最多临时增加多少，`maxUnavailable` 控制更新时最多不可用多少。** readiness 决定新 Pod 何时可接流量，`progressDeadlineSeconds` 可帮助暴露发布长期没有进展。

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
minReadySeconds: 10
progressDeadlineSeconds: 300
```

回滚恢复的是 Deployment 的 Pod 模板修订，不会自动回滚数据库 schema、外部配置或已产生的业务数据。因此数据库迁移要兼容新旧版本并准备独立恢复方案。参见 [Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)。

### 9. Deployment 和 StatefulSet 怎么选？

**结论：Deployment 适合副本可互换的无状态服务；StatefulSet 为每个 Pod 提供稳定身份、有序操作和独立持久卷声明，适合确实依赖这些语义的有状态工作负载。**

StatefulSet 并不会自动实现数据库复制、一致性、选主、备份或灾难恢复。使用它仍需理解具体中间件的集群协议、存储故障域和扩缩容流程。参见 [StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)。

### 10. DaemonSet 适合什么场景？

**结论：DaemonSet 用于让匹配节点各运行一个 Pod，常见于日志采集、节点监控、网络插件和存储代理。** “各节点一个”还会受到 node selector、affinity、taint/toleration 等调度约束影响。

业务 API 通常不适合 DaemonSet，因为业务副本数不应与节点数强绑定。还要评估 DaemonSet 对每个节点的 CPU、内存、磁盘和升级风险。

### 11. Job 和 CronJob 有什么区别？

**结论：Job 管理一次或有限次数完成的任务；CronJob 按计划创建 Job。** Job 的成功语义、并行度、失败重试和完成数由配置决定；CronJob 的调度不等于业务严格“只执行一次”。

任务可能因重试、控制器恢复或并发策略而重复执行，业务侧仍需幂等。定时任务还要考虑 `concurrencyPolicy`、`startingDeadlineSeconds`、时区、历史 Job 清理和错过调度，而不是只写 cron 表达式。

### 12. init container、sidecar 和普通应用容器如何区分？

**结论：init container 在应用容器启动前按顺序完成初始化；sidecar 与主应用协作并具有配套生命周期；普通应用容器承担 Pod 的核心业务。**

初始化工作应可重试、可重复执行，不能假设只运行一次。sidecar 会增加资源、启动/终止顺序和排障复杂度；只有当它与主容器必须共同调度、共享网络或卷时才使用，不要把任意依赖都做成 sidecar。

### 13. `restartPolicy` 和“自愈”有什么边界？

**结论：kubelet 可按 `Always`、`OnFailure` 或 `Never` 重启 Pod 内的容器；工作负载控制器则负责在 Pod 消失后创建替代 Pod。** Deployment 的 Pod 模板只允许 `Always`。

容器重启通常仍在同一 Pod、同一节点上；Pod 被替换后 UID 和 IP 会变化。自愈恢复的是进程和期望副本，不会自动恢复未提交事务、内存会话或执行到一半的业务任务。

## 三、网络、配置与存储

### 14. Kubernetes 的基本网络模型是什么？

**结论：每个 Pod 通常有独立的集群内 IP；同一 Pod 的容器共享网络；跨 Pod 通信由集群网络实现；Service 为会变化的 Pod 集合提供稳定访问入口。**

Pod IP 是易变的，客户端不应把它当长期服务地址。网络模型、Service 数据面、NetworkPolicy 和外部入口分别由 CNI、kube-proxy 或替代实现、策略实现和网关控制器等组件协作，具体故障要按层排查。参见 [Services, Load Balancing, and Networking](https://kubernetes.io/docs/concepts/services-networking/)。

### 15. Service 的常见类型如何选择？

**结论：`ClusterIP` 提供集群内入口；`NodePort` 在节点端口暴露服务；`LoadBalancer` 请求外部负载均衡能力；`ExternalName` 通过 DNS CNAME 映射外部名称。** `ClusterIP` 是默认类型。

普通内部服务优先 ClusterIP；HTTP/HTTPS 外部流量通常经 Gateway 或 Ingress；单个服务也可按基础设施能力使用 LoadBalancer。NodePort 常是其他暴露方式的底层组成或受控场景入口，不宜默认把所有服务直接暴露到节点端口。参见 [Service](https://kubernetes.io/docs/concepts/services-networking/service/)。

### 16. `containerPort`、`targetPort`、`port` 和 `nodePort` 有什么区别？

**结论：`containerPort` 是 Pod 模板中的容器端口声明；Service 的 `targetPort` 指向后端 Pod 端口；`port` 是 Service 自己提供的端口；`nodePort` 是 NodePort/LoadBalancer 类型在节点上暴露的端口。**

`containerPort` 本身不会像 Docker `-p` 那样完成宿主端口发布。排障时沿着“外部入口 → Service port → EndpointSlice → Pod IP:targetPort → 应用监听地址”逐层验证。

### 17. Service 存在但访问不到，应该查什么？

**结论：先看 Service 是否选中了 Ready 的 Pod，再看端口、DNS、网络策略和应用监听。**

```bash
kubectl get svc,endpointslice -n <ns>
kubectl describe svc <service> -n <ns>
kubectl get pod -l app=<label> -n <ns> -o wide
kubectl exec -n <ns> <pod> -- curl -v http://<service>:<port>/health
```

高频原因包括 selector/label 不匹配、readiness 失败、`targetPort` 错误、进程只监听 `127.0.0.1`、NetworkPolicy 拒绝、DNS 异常或网关后端配置错误。不要一上来重启所有 Pod，这会丢失第一现场。

### 18. Ingress、Ingress Controller 和 Gateway API 有什么关系？

**结论：Ingress 是 HTTP/HTTPS 路由 API 对象，Ingress Controller 才是读取规则并实现数据面的组件；只创建 Ingress 而没有对应 Controller 不会自动产生入口。** TLS 终止、注解和高级路由能力常依赖具体实现。

Ingress API 已冻结但没有移除计划，Kubernetes 项目建议新能力评估 Gateway API。Gateway API 以更明确的角色边界和更丰富的路由资源扩展入口治理；是否迁移取决于集群实现与组织需求。参见 [Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/) 和 [Gateway API](https://kubernetes.io/docs/concepts/services-networking/gateway/)。

### 19. ConfigMap 和 Secret 有什么区别？Secret 安全吗？

**结论：ConfigMap 保存非敏感配置；Secret 保存敏感数据并提供不同的引用语义，但 Secret 清单中的 base64 只是编码，不是加密。** 安全性还依赖 etcd 静态加密、传输保护、RBAC、审计、外部密钥系统、挂载方式和应用日志治理。

不要把 Secret 提交到 Git、写进镜像或输出到日志。允许对 Secret 执行 `get`、`list` 或 `watch` 都可能暴露内容，因此权限要最小化。参见 [ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/) 和 [Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)。

### 20. 修改 ConfigMap 或 Secret 后，Pod 会自动使用新值吗？

**结论：取决于注入方式。作为环境变量注入的值不会在运行中的容器自动改变；通过 volume 投射的内容通常会最终更新，但应用是否重新读取、更新时间和 `subPath` 等边界仍需验证。**

可靠做法是明确配置刷新策略：应用支持动态 reload，或通过模板哈希触发 Deployment 滚动更新。发布时还要避免新旧 Pod 读取到互不兼容的配置。

### 21. PV、PVC 和 StorageClass 分别是什么？

**结论：PV 表示生命周期独立于 Pod 的集群存储资源；PVC 是工作负载对存储容量、访问模式等的申请；StorageClass 描述存储类别和动态供应方式。** PVC 可以绑定预创建 PV，也可以通过 StorageClass 动态创建底层卷。

删除 PVC、PV 或 StatefulSet 后底层数据是否保留，受 reclaim policy、控制器保留策略和存储提供方影响。持久卷不是备份，仍需快照、异地副本、恢复演练和数据一致性方案。参见 [Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)。

### 22. `emptyDir`、`hostPath` 和持久卷如何选择？

**结论：`emptyDir` 与 Pod 生命周期绑定，适合缓存和容器间临时共享；`hostPath` 直接耦合节点路径，风险高且不具备通用跨节点持久化语义；PV/PVC 用于需要独立生命周期的持久数据。**

`emptyDir.medium: Memory` 会消耗内存资源，必须控制大小。生产业务数据不要因为“重启后还在”就依赖某个节点的 `hostPath`；Pod 重新调度到别的节点后可能看不到原数据。

## 四、探针、资源与调度

### 23. startup、readiness 和 liveness probe 分别解决什么问题？

**结论：startup 判断慢启动是否完成；readiness 判断当前是否应接收 Service 流量；liveness 判断容器是否已无法自行恢复、需要重启。** 配置 startup probe 后，liveness 和 readiness 会等它成功后再开始。

readiness 失败会让匹配 Service 的 EndpointSlice 不再把该 Pod 作为 Ready 后端，但不会重启容器；liveness/startup 连续失败超过阈值会触发容器终止并按 restart policy 处理。参见 [Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)。

#### 场景追问：启动慢、依赖不可用与进程卡死怎样配置探针？

**面试官：** 启动六十秒、数据库暂不可用、事件循环卡死分别用什么？Readiness 失败会重启吗？

**口语参考答案：**

> Startup 判断应用是否完成启动，适合慢初始化，成功前不执行另外两种探针。Readiness 判断当前能否接收流量，失败后通常从 Service 的就绪后端中移除，不会仅因此重启容器。Liveness 判断是否需要通过重启恢复，持续失败达到阈值会触发重启。所以启动慢配 Startup，暂时无法服务配 Readiness，进程卡死且重启能恢复时配 Liveness。探针阈值要结合真实启动时间和故障恢复方式设置。

**追问与易错点：** 不把所有外部依赖失败都放入 Liveness，否则数据库抖动可能触发集体重启。Readiness 摘流不会自动结束已建立连接，BullMQ Worker 也不会因此自动停止取任务。

### 24. 为什么探针配置错误会制造故障？

**结论：探针是控制信号，不是越全面越好；过重、超时过短或把外部依赖放进 liveness，可能在高负载或依赖故障时触发重启风暴。**

- liveness 只检查本实例是否陷入不可恢复状态，通常不应因数据库短暂不可用就杀进程。
- readiness 可包含提供核心服务所需的依赖，但要轻量、有超时并考虑降级。
- startup 给慢启动足够窗口，避免用巨大的 liveness 延迟掩盖启动问题。
- 监控探针耗时、失败原因和重启次数，不能只看最终 Ready 状态。

### 25. resource requests 和 limits 有什么区别？

**结论：scheduler 主要按 requests 判断节点能否容纳 Pod；kubelet/运行时通过 cgroup 等机制实施 limits。** CPU limit 超出通常表现为 throttling；内存 limit 超出可能触发 OOM kill。实际用量可以高于 request，只要节点资源和限制允许。

```yaml
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: '1'
    memory: 512Mi
```

requests 太小会导致过度装箱和节点压力，太大则导致 Pending 或低利用率；limits 太小会制造限流和 OOM，完全不设又可能让单个工作负载拖垮节点。应基于压测、分位数和生产观测迭代。参见 [Resource Management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)。

### 26. Guaranteed、Burstable 和 BestEffort QoS 有什么意义？

**结论：Kubernetes 根据容器 CPU/内存 requests 与 limits 把 Pod 分为 Guaranteed、Burstable、BestEffort，节点资源压力下会结合 QoS、优先级和超额使用等因素决定驱逐顺序。**

- Guaranteed：每个容器都设置 CPU 和内存 request/limit，且对应 request 等于 limit。
- BestEffort：所有容器都没有设置 CPU/内存 request 和 limit。
- Burstable：其余情况。

Guaranteed 不代表永不被 OOM 或驱逐，也不代表配置一定合理；它只影响资源治理语义和风险排序。支持并启用 Pod 级资源规格的集群还要把 Pod 级 CPU/内存配置纳入判断，因此版本相关追问要先确认集群版本和 feature gate。

### 27. Pod 一直 Pending，如何排查调度问题？

**结论：先看 Pod Events 中 scheduler 给出的不可调度原因，再对照 requests、节点状态、调度约束和存储绑定。**

```bash
kubectl describe pod <pod> -n <ns>
kubectl get events -n <ns> --sort-by=.lastTimestamp
kubectl get nodes
kubectl describe node <node>
kubectl get pvc -n <ns>
```

常见原因包括 CPU/内存 request 无法满足、nodeSelector/affinity 无匹配、taint 没有 toleration、PVC 未绑定、Pod 数或端口等节点约束，以及集群扩容尚未完成。`kubectl top` 的当前低用量不能推翻 scheduler 基于 requests 的容量判断。

### 28. nodeSelector、affinity、taint/toleration 和 topology spread 怎么选？

**结论：nodeSelector/节点 affinity 表达 Pod 想去哪些节点；Pod affinity/anti-affinity 表达 Pod 之间的相互吸引或排斥；taint 让节点排斥 Pod，toleration 只表示允许容忍；topology spread 控制副本跨节点、可用区等故障域的分布。**

toleration 不会保证 Pod 一定调度到该节点；专用节点通常同时使用 taint/toleration 与 node affinity。高可用副本不能只设多副本，还要避免全落在同一节点或可用区。参见 [Scheduling, Preemption and Eviction](https://kubernetes.io/docs/concepts/scheduling-eviction/)。

### 29. HPA 如何扩缩容？为什么配置了 CPU HPA 却不生效？

**结论：HPA 控制器根据 CPU、内存、自定义或外部指标调整目标工作负载的期望副本数。** CPU 利用率通常是当前使用量相对于 request 的比例；相关容器未设置 CPU request 时，该 Pod 的 CPU 利用率可能无法定义，HPA 不会按该指标采取动作。

HPA 还依赖 Metrics API 或对应指标适配器。队列 Worker 更适合结合队列积压、到达率和任务耗时等外部指标，并设置最大副本、缩容稳定窗口和下游容量边界；只按 CPU 可能无法反映积压。参见 [Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)。

### 30. PodDisruptionBudget 能保证服务永不中断吗？

**结论：不能。PDB 限制通过 Eviction API 发起的自愿中断期间同时不可用的副本数，不阻止节点故障等非自愿中断，也不能覆盖所有删除方式。** 直接删除 Pod 或 Deployment 可以绕过 PDB；工作负载自身的滚动更新由对应控制器策略管理。

PDB 要与足够副本、跨故障域分布、readiness、滚动策略和容量余量一起设计。设置得过严还可能让 `kubectl drain` 长期无法完成。参见 [Disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)。

### 31. Pod 被删除或缩容时，优雅终止流程是什么？

**结论：终止宽限期开始后，kubelet 会在适用时执行 `preStop`，再向容器主进程发送停止信号；宽限期耗尽后可强制终止。与此同时，终止中的 Pod 会从常规 Service 流量中摘除，但各组件传播存在时间窗口。**

`preStop` 的执行时间包含在 `terminationGracePeriodSeconds` 内，不是额外赠送的时间。应用应让 PID 1 正确接收 SIGTERM、先停止接收新请求或任务、等待有上界的在途工作、关闭连接，再退出；不要只靠固定 `sleep` 猜测流量已排空。参见 [Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/) 和 [Container Lifecycle Hooks](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks)。

## 五、安全与治理

### 32. Kubernetes 工作负载的最小安全基线是什么？

**结论：使用可信镜像和不可变 digest，以非 root 运行，禁止权限提升，删除无关 capabilities，使用默认 seccomp，尽量只读根文件系统，并限制资源、网络、挂载和 API 权限。**

```yaml
securityContext:
  runAsNonRoot: true
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop: ['ALL']
  seccompProfile:
    type: RuntimeDefault
```

实际镜像若需要写临时目录，应显式挂载受限 `emptyDir`，不能为了启动成功就改回 root 或 privileged。集群侧还应使用 Pod Security Admission、镜像策略、审计和节点加固形成纵深防御。

### 33. ServiceAccount 和 RBAC 应怎样设计？

**结论：ServiceAccount 是工作负载访问 Kubernetes API 等系统时的身份，RBAC 决定该身份能对哪些资源执行哪些动作；应优先 Namespace 级 RoleBinding 和最小权限。** 不需要访问 API 的 Pod 可评估关闭 `automountServiceAccountToken`。

避免通配资源、通配动词和不必要的 ClusterRoleBinding。能创建 Pod 往往也意味着可挂载该 Namespace 的 Secret 或使用其中的 ServiceAccount，属于高权限；读取、列出或 watch Secret 也可能暴露其内容。参见 [Service Accounts](https://kubernetes.io/docs/concepts/security/service-accounts/) 和 [RBAC Good Practices](https://kubernetes.io/docs/concepts/security/rbac-good-practices/)。

### 34. NetworkPolicy 能解决什么问题？

**结论：NetworkPolicy 用 label selector 描述允许的 Pod 入站和出站流量，适合实现默认拒绝和最小通信路径；它不是应用层身份认证或 HTTP 路由规则。**

策略是否生效依赖网络插件支持；API 对象存在不代表数据面一定执行。落地时通常先建立 namespace/pod 级默认拒绝，再逐条放行 DNS、依赖服务和必要出口，并通过真实连通性测试验证，避免一次性切断监控、DNS 或控制链路。

## 六、Node/BullMQ 项目实战与排障

### 35. BullMQ Worker 所在 Pod 缩容时，正在执行的任务怎么办？

**结论：Kubernetes 只负责终止 Pod，应用必须把终止信号转换成“停止领取新任务、等待在途任务、超时后安全退出”的业务流程。**

```text
Pod 进入 Terminating
  → Service 端点进入终止摘除（如有 HTTP 流量）
  → 容器主进程收到 SIGTERM
  → Worker 停止领取新任务
  → 等待在途任务到安全检查点或完成
  → 关闭 Redis、数据库、浏览器等资源
  → 在 terminationGracePeriodSeconds 内退出
```

宽限期要覆盖正常任务尾部耗时，但不能无限放大；超长任务应拆分、支持检查点或允许可靠重试。现有采集项目记录了 30 秒终止窗口，但自定义 Worker drain/stalled 参数不能当作已实现事实，面试时应按真实代码确认。关联 [住建部企业资质采集服务](../98-项目深挖/住建部企业资质采集服务.md)。

### 36. Pod 在任务执行中被强制杀掉，Kubernetes 会自动恢复业务任务吗？

**结论：不会。Kubernetes 可以补 Pod 或重启容器，却不知道某个 BullMQ job 和数据库状态是否已提交；任务可靠性必须由队列、事实表和幂等消费共同保证。**

回答应覆盖：队列锁续期与 stalled 恢复、稳定业务唯一键、重复入队去重、消费侧 upsert/幂等、事实表超时扫描、重试上限和不可重试错误。整体按“至少一次执行 + 幂等结果”设计，不承诺 exactly-once。详见 [队列与任务编排](../09-Node与服务端/队列与任务编排.md)。

### 37. Pod 出现 `CrashLoopBackOff`，如何排查？

**结论：`CrashLoopBackOff` 表示容器反复退出或被重启并进入退避，不是根因。先找上一次退出原因，再检查启动命令、配置、依赖、权限、探针和资源。**

```bash
kubectl describe pod <pod> -n <ns>
kubectl logs <pod> -n <ns> -c <container> --previous
kubectl get pod <pod> -n <ns> -o yaml
```

重点看 `lastState.terminated`、exit code、reason、Events 和上一实例日志。常见根因有错误命令、缺少 Secret、数据库不可达、文件权限、liveness 误杀和 OOMKilled。修复前保留证据，不要用无限重启或把 liveness 删除后就宣称问题解决。

#### 场景追问：NestJS 启动失败并提示 MySQL ECONNREFUSED

**面试官：** 镜像构建推送成功却反复重启；日志显示 MySQL ECONNREFUSED，怎么定位？新版本不可用怎么办？

**口语参考答案：**

> CrashLoopBackOff 说明容器反复退出或被重启，当前处在退避等待，不能仅据此认定镜像有问题。我会先看 Pod 状态、退出原因和 Events，再看当前及上一次容器日志。ECONNREFUSED 时核对 Pod 实际生效的数据库地址、端口、环境变量和 Secret，再看数据库是否监听、Service 与 Endpoint 是否正确，以及连通性。若发布造成可用性下降，先按预案回滚并验证服务恢复，再分析根因。

```bash
kubectl get pods -n app
kubectl describe pod POD_NAME -n app
kubectl logs POD_NAME -n app -c nest-api --previous
kubectl rollout status deployment/nest-api -n app
kubectl rollout undo deployment/nest-api -n app
```

**追问与易错点：** 命令中的名称需要替换，回滚命令仅在确认需要恢复时执行。ECONNREFUSED 与认证失败、DNS 失败、超时不同；不要把含凭证的完整环境变量打印到公共日志。回滚 Deployment 不会自动回滚数据库迁移。

### 38. Pod `Pending`、`Running` 和 `Ready` 分别说明什么？

**结论：Pending 表示 Pod 尚未完成调度或至少一个容器仍未准备运行；Running 表示 Pod 已绑定节点且至少一个主要容器运行或正在启动/重启；Ready 是 condition，表示 Pod 是否满足接流量条件。**

因此 Running 不等于业务可用，Ready 也不等于所有下游链路绝对健康。排障时同时看 phase、conditions、container states、restart count、Events 和应用指标。参见 [Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)。

### 39. Pod 显示 `OOMKilled`，应该怎么处理？

**结论：先确认是容器触及 memory limit，还是节点内存压力导致的驱逐/系统 OOM，再区分限制过小、瞬时峰值、泄漏、缓存、子进程和内存型 `emptyDir`。**

```bash
kubectl describe pod <pod> -n <ns>
kubectl top pod <pod> -n <ns> --containers
kubectl describe node <node>
```

只提高 limit 可能掩盖泄漏，只降低并发可能牺牲吞吐。Node.js/Playwright Worker 要分别观察 JS heap、native memory、浏览器子进程和任务并发，用压测和生产分位数共同调整并发、requests 与 limits。

### 40. 新版本发布后 5xx 上升，怎样定位和止损？

**结论：先暂停发布并根据影响回滚到上一已验证镜像，再沿“变更 → rollout → Pod → Service/入口 → 依赖”定位，不要在故障中继续扩大新版本比例。**

```bash
kubectl rollout status deployment/<name> -n <ns>
kubectl rollout history deployment/<name> -n <ns>
kubectl get rs,pod -n <ns> -l app=<label> -o wide
kubectl logs -n <ns> -l app=<label> --all-containers=true --prefix --tail=200
kubectl describe deployment/<name> -n <ns>
kubectl rollout undo deployment/<name> -n <ns>
```

对比新旧 ReplicaSet 的镜像 digest、配置哈希、readiness、错误率、延迟和依赖兼容性。回滚前确认数据库迁移是否向后兼容；回滚后仍要验证错误率恢复并保留现场，形成发布卡口和回归用例。关联 [发版安全](../12-场景题/发版安全.md)。

## 常用命令速查

| 目标                  | 命令                                                                 |
| --------------------- | -------------------------------------------------------------------- |
| 查看常用资源          | `kubectl get deploy,rs,pod,svc -n <ns> -o wide`                      |
| 查看对象详情和事件    | `kubectl describe <kind> <name> -n <ns>`                             |
| 查看当前/上次容器日志 | `kubectl logs <pod> -n <ns> -c <container>` / `--previous`           |
| 进入容器诊断          | `kubectl exec -it <pod> -n <ns> -c <container> -- sh`                |
| 查看最终清单          | `kubectl get <kind> <name> -n <ns> -o yaml`                          |
| 查看资源使用          | `kubectl top pod -n <ns> --containers` / `kubectl top node`          |
| 查看发布状态          | `kubectl rollout status deployment/<name> -n <ns>`                   |
| 查看/回滚版本         | `kubectl rollout history deployment/<name> -n <ns>` / `rollout undo` |
| 查看服务后端          | `kubectl get svc,endpointslice -n <ns>`                              |
| 查看排序后的事件      | `kubectl get events -n <ns> --sort-by=.lastTimestamp`                |
| 临时端口转发          | `kubectl port-forward -n <ns> pod/<pod> 3000:3000`                   |
| 检查权限              | `kubectl auth can-i <verb> <resource> -n <ns>`                       |

命令能看到的范围受 RBAC 和集群组件影响；`kubectl top` 依赖 Metrics API。生产环境的 `exec`、端口转发和 Secret 读取都应受权限和审计约束。

## 场景速查

| 场景               | 首选检查                                          | 常见误区                    |
| ------------------ | ------------------------------------------------- | --------------------------- |
| Pod 一直 Pending   | Events、requests、调度约束、PVC                   | 只看节点当前 CPU 使用率     |
| CrashLoopBackOff   | `--previous` 日志、exit code、Events              | 只增加重启次数              |
| Running 但不接流量 | readiness、EndpointSlice、Service selector        | 把 Running 当作 Ready       |
| Service 不通       | selector、端口、EndpointSlice、DNS、NetworkPolicy | 直接访问易变 Pod IP         |
| 发布卡住           | rollout status、readiness、镜像拉取、配额         | 继续发布扩大影响            |
| OOMKilled          | lastState、limit、节点压力、进程内存              | 只调大 limit 不查增长原因   |
| HPA 不扩容         | requests、Metrics API、目标指标、maxReplicas      | 认为副本数会按流量自动变化  |
| drain 卡住         | PDB、终止宽限期、不可驱逐 Pod                     | 强删前不评估可用性          |
| Worker 缩容丢任务  | SIGTERM、停止取新任务、队列恢复、幂等             | 把 Pod 补副本等同于任务恢复 |
| Secret 泄露        | RBAC、Git/镜像/日志、审计、轮换                   | 把 base64 当加密            |

## 自测清单

- [ ] 能从 API Server、etcd、scheduler、controller 和 kubelet 解释控制循环。
- [ ] 能区分 Pod、ReplicaSet、Deployment、StatefulSet、DaemonSet、Job 与 CronJob。
- [ ] 能解释滚动更新、readiness、`maxSurge`、`maxUnavailable` 和回滚边界。
- [ ] 能从 Pod IP、Service、EndpointSlice、Ingress/Gateway 画出请求链路。
- [ ] 能区分 ConfigMap、Secret、PV、PVC、StorageClass 和临时存储。
- [ ] 能说清 startup、readiness、liveness 各自触发的控制动作。
- [ ] 能解释 requests、limits、CPU throttling、OOM 和 QoS。
- [ ] 能用调度约束、污点容忍和拓扑分布解释 Pending 与高可用。
- [ ] 能说明 HPA 指标、requests 和下游容量的关系。
- [ ] 能说明 PDB 只覆盖部分自愿中断，不承诺绝对可用。
- [ ] 能从 SIGTERM、`preStop` 和终止宽限期解释优雅退出。
- [ ] 能说明 ServiceAccount、RBAC、SecurityContext 和 NetworkPolicy 的职责边界。
- [ ] 能把 Pod 自愈与 BullMQ 任务恢复、幂等消费明确分开。
- [ ] 能按 Events、conditions、日志、指标和变更记录定位发布故障。
