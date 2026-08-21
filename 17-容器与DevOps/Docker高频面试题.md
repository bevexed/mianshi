# Docker 高频面试题

面向中高级前端、Node.js 与全栈岗位：回答先说明 Docker 解决什么问题，再讲隔离、数据、网络和故障边界。Docker Engine、Docker Desktop、Compose 与编排平台并不是同一层；具体行为还要结合宿主系统、Engine 版本和部署方式验证。

## 一、基础原理与生命周期

### 1. Docker 解决什么问题？

**结论：Docker 把应用、运行时和依赖封装成可分发镜像，再以隔离进程的方式运行，主要解决环境一致性、交付可重复性和部署密度问题。**

它不能自动解决应用架构、数据一致性、配置管理、可观测性和高可用。开发机能启动也不等于生产可用；仍要验证目标 CPU 架构、内核能力、资源、网络、持久化和故障恢复。

### 2. 容器和虚拟机有什么区别？

**结论：虚拟机通常虚拟出硬件并运行完整客体操作系统；容器本质上是宿主内核上的隔离进程，多个 Linux 容器共享宿主 Linux 内核。** 因此容器通常启动更快、额外开销更小，但隔离边界不等同于独立虚拟机。

Docker Desktop 在 macOS 和 Windows 上通常借助 Linux 虚拟机运行 Linux 容器，所以“共享内核”要结合实际宿主环境理解。镜像的可移植性也受操作系统、CPU 架构和外部依赖约束，不能绝对化为“构建一次，到处无差别运行”。参见 [容器与虚拟机](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/)。

### 3. 镜像、容器、仓库和 Registry 分别是什么？

**结论：镜像是创建容器的只读分层模板，容器是镜像的一次运行实例；repository 管理同一镜像的不同标签，registry 负责存储和分发仓库。**

一个镜像可以创建多个互相独立的容器。镜像层只读，容器运行时在其上增加独立可写层。标签如 `app:latest` 可以被重新指向，不能充当不可变版本；发布需要可追踪标签，强一致场景进一步记录镜像 digest。参见 [镜像基础](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-an-image/)。

### 4. 容器隔离主要依赖什么？

**结论：Linux 容器通常用 namespace 隔离进程、网络、挂载点等视图，用 cgroup 统计和限制资源，再结合 capabilities、seccomp、用户 namespace 等缩小权限。** 镜像分层和容器可写层负责文件系统视图。

容器仍共享内核；内核漏洞、过高 capabilities、`--privileged`、宿主目录或 Docker socket 挂载都可能突破预期边界。因此“进了容器就安全”是错误结论。

### 5. `docker run`、`create`、`start` 和 `exec` 有什么区别？

**结论：`run` 约等于先 `create` 再 `start`；`start` 启动已有容器的主进程；`exec` 只是在运行中的容器里再启动一个进程。**

- `docker run IMAGE ...`：按镜像和参数创建新容器并启动；重复执行通常会产生多个容器。
- `docker start NAME`：保留原容器的可写层和配置，重新启动它。
- `docker exec NAME COMMAND`：用于诊断或受控运维，不会替换主进程，也不是修改镜像的方式。
- 容器的主进程退出后，容器就停止；后台子进程仍存在并不能保证容器继续运行。

### 6. 停止、删除容器后，数据一定会丢吗？

**结论：停止或重启容器不会删除它的可写层；删除容器会丢失只写在该层的数据，而独立 volume 或宿主 bind mount 的数据按各自生命周期保留。**

状态型服务不应把关键数据只写进容器层。还要分别验证“容器重建”“volume 误删”“宿主损坏”三类故障；volume 持久化不等于备份，更不等于跨主机灾备。

## 二、镜像与 Dockerfile

### 7. Dockerfile 中常见指令分别做什么？

**结论：`FROM` 选择基础镜像或开始新阶段，`RUN` 在构建期执行命令，`COPY` 复制构建上下文文件，`ENV` 设置环境变量，`USER` 指定后续构建及默认运行用户，`CMD`/`ENTRYPOINT` 定义容器启动命令。**

`WORKDIR` 设置后续指令工作目录；`EXPOSE` 只声明镜像预期监听端口，不会把端口发布到宿主机；`HEALTHCHECK` 定义容器内健康探测。完整语义见 [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)。

### 8. `RUN`、`CMD` 和 `ENTRYPOINT` 有什么区别？

**结论：`RUN` 发生在构建期并生成镜像层；`CMD` 和 `ENTRYPOINT` 发生在容器启动时。`ENTRYPOINT` 适合固定主程序，`CMD` 适合提供默认命令或默认参数。**

优先使用 JSON exec form，避免多一层 shell 阻断信号：

```dockerfile
ENTRYPOINT ["node", "dist/main.js"]
CMD ["--port", "3000"]
```

此时 `docker run image --port 8080` 会替换 `CMD` 参数并保留 `ENTRYPOINT`。若只有 `CMD ["node", "dist/main.js"]`，运行时追加命令会整体覆盖它。

### 9. `COPY` 和 `ADD` 怎么选？

**结论：普通本地文件复制优先 `COPY`，因为语义清楚；只有明确需要 `ADD` 的远程来源或自动解包等额外能力时才使用它。**

普通 `COPY`/`ADD` 的本地源只能访问构建上下文允许的内容；多阶段构建、named context 和 `ADD` 远程源等能力需要显式声明。把仓库根目录作为过大的上下文会拖慢传输并扩大误带敏感文件的风险，应使用 `.dockerignore` 排除 `.git`、本地缓存、构建产物、日志和本地环境文件。

### 10. 镜像为什么分层，构建缓存如何失效？

**结论：Dockerfile 指令形成可复用的构建结果；某一步输入发生变化后，该步及依赖它的后续步骤通常需要重新执行。** 因此变化频率低的步骤放前面，业务源码等高频变化内容放后面。

Node 项目通常先复制 `package.json` 和 lockfile 安装依赖，再复制源码：

```dockerfile
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
```

这样只改业务源码时可复用依赖安装缓存。`--no-cache` 会重新执行构建步骤，但不会自动拉取新的基础镜像；需要时配合 `--pull`。参见 [构建最佳实践](https://docs.docker.com/build/building/best-practices/)。

### 11. 多阶段构建解决什么问题？

**结论：多阶段构建把编译工具链与最终运行环境分开，只把运行所需产物复制到最终镜像，从而减少体积和攻击面。**

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm prune --prod

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd --system --gid 1001 app \
  && useradd --system --uid 1001 --gid app app
COPY --from=build --chown=app:app /app/package.json ./
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
USER app
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

实际项目还要按 Node/pnpm 版本、原生依赖、workspace 布局和运行产物调整，不能机械复制。参见 [多阶段构建](https://docs.docker.com/build/building/multi-stage/)。

### 12. 镜像越小越好吗？Alpine 一定优于 Debian slim 吗？

**结论：镜像大小只是一个指标，还要看 libc 兼容性、原生依赖、调试能力、安全更新和团队运维成本。** Alpine 常更小但使用 musl，某些预编译原生模块或依赖 glibc 的程序需要额外适配；slim 镜像可能更大，却有更熟悉的兼容路径。

正确做法是选择受维护、与运行时匹配的最小可用基础镜像，移除构建工具和无关包，再用实际拉取速度、漏洞、启动、内存和排障成本验证，而不是只比较压缩体积。

### 13. `ARG`、`ENV` 和构建 secret 有什么边界？

**结论：`ARG` 是构建参数，`ENV` 会进入镜像配置并成为容器默认环境；两者都不适合传递密码、令牌或私钥。** 构建需要访问私有依赖时，应使用 BuildKit secret/SSH mount，让凭据只在对应构建步骤临时可见。

运行时秘密应由部署平台的 secret 能力或受控文件挂载注入，并避免写入镜像、Compose 文件、命令历史和日志。参见 [Build secrets](https://docs.docker.com/build/building/secrets/)。

### 14. 如何保证镜像可追踪、可复现和可回滚？

**结论：构建一次并推广同一个镜像 digest；记录源码提交、构建环境和依赖锁，使用不可混淆的发布标签，并保留上一稳定版本。**

基础镜像标签可能变化，因此要定期主动重建并扫描；高要求场景可固定 digest，但仍需维护升级流程。CI 中生成 SBOM/provenance、扫描已知漏洞并校验来源能增强供应链证据，但不能证明业务代码没有漏洞。参见 [Build attestations](https://docs.docker.com/build/metadata/attestations/)。

## 三、存储与网络

### 15. volume、bind mount 和 tmpfs 怎么选？

**结论：volume 由 Docker 管理，适合持久化容器数据；bind mount 直接映射宿主路径，适合开发源码或必须与宿主共享的文件；tmpfs 位于内存，适合不需持久化的临时数据。**

| 类型       | 生命周期与位置                | 常见场景                 | 主要风险                       |
| ---------- | ----------------------------- | ------------------------ | ------------------------------ |
| volume     | 独立于容器，由 Docker 管理    | 数据库数据、应用持久数据 | 仍需备份，误删 volume 会丢数据 |
| bind mount | 直接依赖宿主路径              | 本地开发、宿主配置       | 路径耦合、权限问题、可修改宿主 |
| tmpfs      | 内存中，容器停止/重启后不保留 | 临时文件、短期敏感数据   | 占用内存、不可恢复             |

不要直接操作 Docker 管理的 volume 底层目录；通过挂载、备份和恢复流程管理。参见 [Docker storage](https://docs.docker.com/engine/storage/)。

### 16. 挂载目录后，为什么镜像中原有文件“消失”了？

**结论：mount 会在容器视图中遮住目标路径原有内容，不是把镜像层文件删除了。** 卸载或重建不带该 mount 的容器后，镜像原文件仍存在。

排查时用 `docker inspect` 查看实际 `Mounts`、Source、Destination 和读写模式。不要在已含应用代码的目录上随意挂空目录；开发环境的源码 bind mount 也可能遮住镜像内安装好的依赖。

### 17. Docker 常见网络模式有哪些？

**结论：单机最常用用户自定义 bridge；`host` 减少网络隔离并直接使用宿主网络；`none` 关闭常规网络；跨主机通信需额外的路由或 overlay/编排网络。**

用户自定义 bridge 提供容器名 DNS 和网络隔离，通常优于把所有容器放进默认 bridge。`host` 的行为和支持范围受平台影响，不应作为“网络不通就开启”的通用修复。参见 [Networking overview](https://docs.docker.com/engine/network/) 与 [Bridge driver](https://docs.docker.com/engine/network/drivers/bridge/)。

### 18. 为什么容器里访问 `localhost` 连不上另一个容器？

**结论：每个容器有自己的网络 namespace，容器内 `localhost` 指向当前容器本身，不是宿主机或其他容器。**

在同一用户自定义网络或 Compose 项目中，应使用目标服务名和容器端口，例如 `postgres://db:5432/app`。访问宿主服务要使用平台提供的宿主地址或显式网关配置，并确认宿主服务监听地址与防火墙；不要硬编码某次运行分配的容器 IP。

### 19. `EXPOSE`、容器端口和 `-p` 有什么区别？

**结论：应用在容器内监听容器端口；`EXPOSE` 只是镜像元数据声明；`-p HOST:CONTAINER` 才把端口发布到宿主地址。**

```bash
docker run --rm -p 127.0.0.1:8080:3000 app:dev
```

未指定宿主 IP 时，发布端口通常会绑定到所有宿主地址，可能扩大暴露面。数据库、调试端口和管理端点应按需要限制到回环地址、内网或反向代理，并由防火墙和认证继续保护；容器网络不是授权系统。

## 四、Compose 与运行可靠性

### 20. Docker Compose 解决什么问题？

**结论：Compose 用声明式 YAML 描述一组服务、网络、volume、配置和依赖，适合本地多服务环境、CI 集成测试以及经过约束的单机部署。**

`docker compose up -d` 会按配置创建或更新资源，`down` 删除项目容器和默认网络；是否删除 volume 取决于参数和 volume 定义。Compose 不是跨多主机调度器，不自动提供副本调度、节点故障迁移和完整的滚动发布能力。

### 21. `depends_on` 能保证数据库已经可用吗？

**结论：只声明启动顺序不等于服务就绪；默认条件主要保证依赖容器已启动。需要 readiness 时，应给依赖定义真实 `healthcheck`，再使用 `condition: service_healthy`。**

```yaml
services:
  api:
    build: .
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:17
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U $${POSTGRES_USER}']
      interval: 10s
      timeout: 5s
      retries: 5
```

应用仍应实现有上界的连接重试和断线恢复，因为运行中依赖也会重启或发生网络抖动。参见 [Compose 启停顺序](https://docs.docker.com/compose/how-tos/startup-order/)。

### 22. healthcheck 和 restart policy 各解决什么问题？

**结论：healthcheck 判断主进程仍在但服务是否可用；restart policy 决定容器进程退出后是否重启。健康状态变为 `unhealthy` 本身不等于 Docker Engine 会自动重启容器。**

探针应轻量、快速、有超时，并检查本实例能否提供核心服务；不要让每次探针执行昂贵全链路请求。真正的自动替换、不健康流量摘除和副本维持通常由编排或外部监控层处理。

### 23. 容器为什么要正确处理 PID 1 和退出信号？

**结论：容器主进程是 PID 1，必须收到并处理停止信号、停止接收新请求、等待在途任务并清理资源；shell form 或错误启动脚本可能阻断信号转发。**

优先使用 exec form 的 `CMD`/`ENTRYPOINT`，脚本最后用 `exec` 替换 shell；需要回收孤儿进程时可评估 `--init`。停止宽限期结束后进程可能被强制终止，所以应用关停逻辑也必须有时间上界。参见 [Dockerfile 的 ENTRYPOINT 与停止信号](https://docs.docker.com/reference/dockerfile/#entrypoint)。

### 24. 容器资源限制如何设置，OOM 如何理解？

**结论：容器默认可能没有 CPU 和内存上限；应以压测和生产观测为依据设置限制与容量余量。触及内存硬限制时，容器内进程可能被内核 OOM kill。**

`--memory` 控制内存硬上限，`--cpus` 控制可使用 CPU 配额；CPU 受限常表现为 throttling 和延迟上升，内存受限可能直接退出。先查看容器退出状态、`OOMKilled`、`docker stats`、宿主内核日志和应用指标，再区分内存泄漏、瞬时峰值、缓存增长或限制过小。参见 [资源约束](https://docs.docker.com/engine/containers/resource_constraints/)。

### 25. 容器日志为什么会把磁盘写满？

**结论：应用持续写 stdout/stderr 后由 logging driver 接收；Docker 默认 `json-file` 驱动若未配置轮转，日志可能持续占用宿主磁盘。**

生产要设置日志轮转或使用有轮转能力的驱动，把关键日志集中采集并限制级别、大小与保留期。修改 daemon 默认日志配置通常只影响之后新建的容器，已有容器要重建才会应用。参见 [Logging drivers](https://docs.docker.com/engine/logging/configure/)。

### 26. Compose 可以直接用于生产吗？

**结论：可以用于边界清晰的单机部署，但必须补齐生产配置、备份恢复、监控告警、升级回滚和宿主故障预案；需要跨节点调度与自愈时应使用相应编排平台。**

生产通常去掉源码 bind mount，使用不可变镜像，限制端口与资源，设置 restart policy、日志和健康检查，并把环境差异放在受控覆盖配置中。是否升级到 Kubernetes/其他编排取决于副本数、节点数、发布策略和团队运维能力，而不是“用了 Docker 就必须上 K8s”。参见 [Compose in production](https://docs.docker.com/compose/how-tos/production/)。

## 五、安全与生产边界

### 27. 容器安全的最小基线是什么？

**结论：使用可信且受维护的最小基础镜像，以非 root 用户运行，删除不需要的 capabilities，保持默认 seccomp 等防护，尽量只读文件系统，并限制网络、挂载与资源。**

避免 `--privileged`、宿主根目录挂载和不受控 Docker socket；后者通常能控制 Docker daemon，效果接近取得宿主高权限。镜像和依赖要持续重建、扫描、修复与验证，不能只在首次发布前扫一次。

### 28. 容器内的 root 等于宿主 root 吗？

**结论：默认情况下容器 root 受到 namespace、capabilities、seccomp 等约束，不等于可以任意操作宿主；但它仍比非 root 风险高，配置错误或内核/运行时漏洞可能放大影响。**

应用镜像应设置 `USER`。更高隔离要求可评估 user namespace 或 rootless mode；rootless 让 daemon 和容器都在非 root 用户上下文运行，但网络、存储和低端口等能力存在环境约束，需要实际验证。参见 [Rootless mode](https://docs.docker.com/engine/security/rootless/)。

### 29. 镜像扫描通过就能证明安全吗？

**结论：不能。镜像扫描主要识别已知组件及其已知漏洞，还会受软件清单、漏洞库、发行版修复状态和扫描时点影响。** 它通常发现不了完整的业务越权、弱配置、运行时暴露和未知漏洞。

应组合可信来源、固定并更新依赖、SBOM/provenance、签名/策略、secret 检查、最小权限、应用安全测试和运行时监控。对高危漏洞还要判断实际可达性和修复影响，但不能用“暂时不可利用”永久忽略升级。

## 六、排障与面试场景

### 30. 容器启动后立刻退出，如何排查？

**结论：先确认主进程为什么结束，再检查命令、配置、权限和依赖，不要先用无限循环把容器强行保持运行。**

```bash
docker ps -a
docker logs --tail 200 <container>
docker inspect <container>
docker image inspect <image>
```

重点看退出码、`Error`、`OOMKilled`、最终 `Path/Args`、环境变量名、mount、工作目录和用户。需要交互验证镜像时可覆盖 entrypoint 启动 shell，但这只是诊断，最终要修复真实主进程。

### 31. 容器间或宿主访问容器不通，如何排查？

**结论：按“应用是否监听 → 地址是否正确 → 是否同网络 → 端口是否发布 → 宿主防火墙/代理”逐层检查。**

- 容器内应用应监听 `0.0.0.0` 或目标接口，而不是只监听容器内 `127.0.0.1`。
- 容器间用服务名和容器端口，不用宿主映射端口或硬编码容器 IP。
- 宿主访问需确认 `docker ps`/`inspect` 的端口绑定。
- 跨主机再检查安全组、防火墙、路由、DNS 和反向代理。

### 32. 宿主磁盘满，如何判断是不是 Docker？

**结论：先用宿主文件系统工具确认哪个分区满，再用 `docker system df`、容器日志配置、镜像、构建缓存和 volume 定位来源。**

不要直接删除 Docker 数据目录，也不要在未确认引用与备份前执行大范围 prune。镜像/缓存可按发布和回滚策略清理；volume 可能保存唯一业务数据；日志应先止住增长并配置轮转，再做受控清理。

### 33. 容器 CPU 或内存异常，如何排查？

**结论：先确认是容器限制导致的 throttling/OOM，还是应用自身负载、泄漏或依赖异常，再把容器指标与应用指标、请求和宿主资源对齐。**

```bash
docker stats --no-stream
docker top <container>
docker inspect <container>
docker logs --since 30m <container>
```

高 PIDS 可能来自线程增长；高内存要区分 heap、native、page cache 与子进程；CPU 高要结合请求量、事件循环延迟、profiling 和限额。只提高限制可能暂时掩盖泄漏，只降低限制则可能制造重启风暴。

### 34. 生产发布一个容器化 Node 服务，回答应覆盖什么？

```text
锁定依赖并测试
  → 多阶段构建不可变镜像
  → 扫描并记录 digest / SBOM / provenance
  → 灰度或滚动部署
  → readiness 通过后接流量
  → 观察错误率、延迟、资源和日志
  → 异常时回滚上一 digest
```

回答时补充：配置和 secret 在运行时注入；进程处理 SIGTERM；关键状态外置并有备份；资源限制基于压测；数据库迁移向前/向后兼容；镜像回滚不等于数据库自动回滚。

## 常用命令速查

| 目标                   | 命令                                           |
| ---------------------- | ---------------------------------------------- |
| 查看运行/全部容器      | `docker ps` / `docker ps -a`                   |
| 查看日志               | `docker logs --tail 200 -f <container>`        |
| 查看完整配置与状态     | `docker inspect <container>`                   |
| 进入运行容器诊断       | `docker exec -it <container> sh`               |
| 查看资源与进程         | `docker stats` / `docker top <container>`      |
| 查看空间占用           | `docker system df`                             |
| 查看网络与 volume      | `docker network ls` / `docker volume ls`       |
| 构建镜像               | `docker build -t app:dev .`                    |
| 启动 Compose 项目      | `docker compose up -d --build`                 |
| 查看 Compose 状态/日志 | `docker compose ps` / `docker compose logs -f` |
| 展开 Compose 最终配置  | `docker compose config`                        |

## 场景速查

| 场景                  | 首选检查                                   | 常见误区                           |
| --------------------- | ------------------------------------------ | ---------------------------------- |
| 构建越来越慢          | 上下文、`.dockerignore`、层顺序、缓存命中  | 所有构建都加 `--no-cache`          |
| 镜像过大              | 多阶段、基础镜像、构建依赖与缓存文件       | 不顾兼容性直接换 Alpine            |
| 数据重建后消失        | mount 类型、实际路径、volume 生命周期      | 把容器可写层当数据库存储           |
| 服务间连接失败        | 服务名、容器端口、网络、监听地址           | 容器里用 `localhost` 找另一个服务  |
| 服务 running 但不可用 | healthcheck、应用日志、依赖和线程/事件循环 | 把“进程存在”等同于“服务就绪”       |
| 容器反复重启          | 退出码、OOM、探针、依赖、restart policy    | 只提高重启次数，不查首次失败原因   |
| 宿主磁盘满            | 日志、镜像、构建缓存、volume、容器可写层   | 未确认数据就执行 `prune --volumes` |

## 自测清单

- [ ] 能解释容器与虚拟机的隔离、性能和安全边界。
- [ ] 能区分 image、container、repository、registry、tag 与 digest。
- [ ] 能说明 `RUN`、`CMD`、`ENTRYPOINT` 及 exec form 的差异。
- [ ] 能写出使用 pnpm、多阶段构建、非 root 用户的 Node Dockerfile。
- [ ] 能解释构建缓存失效，并用 `.dockerignore` 控制上下文。
- [ ] 能区分容器可写层、volume、bind mount 与 tmpfs 生命周期。
- [ ] 能解释容器内 `localhost`、服务名 DNS 和端口发布。
- [ ] 能说明 `depends_on`、healthcheck 与 restart policy 的职责边界。
- [ ] 能从 PID 1、SIGTERM 和宽限期解释优雅退出。
- [ ] 能从 OOM、CPU throttling、日志和磁盘定位运行故障。
- [ ] 能说明非 root、capabilities、seccomp、secret 和镜像供应链基线。
- [ ] 能判断单机 Compose 何时够用、何时需要更完整的编排平台。
