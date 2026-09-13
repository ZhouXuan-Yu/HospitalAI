import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "D:/WorkProject/HospitalAI/outputs/research-platform-quotation";
const outputPath = `${outputDir}/HospitalAI医学科研智能平台功能清单及分期报价建议版.xlsx`;
const wb = Workbook.create();

const navy = "#174A67";
const blue = "#3E7FA6";
const lightBlue = "#DCECF5";
const phase1 = "#F8D8C3";
const phase2 = "#D8E9F5";
const phase3 = "#DCECCF";
const yellow = "#FFF2CC";
const green = "#E2F0D9";
const gray = "#F3F6F8";
const line = "#B8C8D3";
const white = "#FFFFFF";
const dark = "#18323F";
const phaseFill = {
  "一期（核心平台）": phase1,
  "二期（医院试点）": phase2,
  "三期（增强扩展）": phase3,
};

const requirements = [
  ["MRP-PROJ-01","项目与课题管理","科研项目中心","创建、复制、归档科研项目，展示负责人、科室、状态、风险、待办与里程碑。","一期（核心平台）","P0","必选","标准产品","项目可创建并持久化；授权用户可检索；归档不删除历史版本。",14],
  ["MRP-PROJ-02","项目与课题管理","项目成员与协作范围","配置 PI、研究助理、统计师、医学负责人、科研管理等项目角色。","一期（核心平台）","P0","必选","标准产品","项目成员权限由服务端生效，未授权用户不可查看项目或数据。",10],
  ["MRP-TOPIC-01","项目与课题管理","选题结构化向导","通过 PICO/PECO 引导形成研究人群、暴露/干预、对照、结局和时间窗。","一期（核心平台）","P0","必选","标准产品","研究意向可保存为版本化结构；必填项缺失时阻断提交。",18],
  ["MRP-TOPIC-02","项目与课题管理","选题可行性评估","从创新性、临床价值、数据可得性、样本量、伦理风险和周期形成评估。","一期（核心平台）","P0","必选","标准产品+配置","形成评分、风险清单、数据需求和继续/调整/停止结论。",16],
  ["MRP-TOPIC-03","项目与课题管理","院内课题查重与复用","按题目、疾病、药物、终点和变量检索院内历史项目，减少重复立项。","三期（增强扩展）","P2","选配","标准产品","授权范围内返回相似项目及可复用模板，不泄露未授权数据。",12],

  ["MRP-PROTOCOL-01","研究方案设计","研究协议模板","支持诊断效能、药物比较、实验室质量三类首发研究协议模板。","一期（核心平台）","P0","必选","标准产品","三类模板均可生成、版本比较、审核和冻结。",24],
  ["MRP-PROTOCOL-02","研究方案设计","人群与时间零点定义","定义索引日期、洗脱期、基线期、观察期、随访期及删失规则。","一期（核心平台）","P0","必选","标准产品","时间零点和观察窗口未定义时不可进入数据提取。",14],
  ["MRP-PROTOCOL-03","研究方案设计","终点与协变量规划","维护主要/次要终点、候选协变量、偏倚来源及结局判定方式。","一期（核心平台）","P0","必选","标准产品","终点和协变量均关联来源、定义、时间窗及版本。",15],
  ["MRP-PROTOCOL-04","研究方案设计","样本量参数与可行性提示","录入效应量、显著性水平、检验效能等参数，生成方法学提示。","一期（核心平台）","P0","建议","统计专项","参数与假设可追溯；结果标注为估算并需统计师确认。",14],
  ["MRP-PROTOCOL-05","研究方案设计","伦理与研究注册管理","绑定伦理审批/豁免、立项、注册、有效期和附件。","一期（核心平台）","P0","必选","标准产品","伦理状态成为数据授权和成果发布的强制门禁。",12],

  ["MRP-AUTH-01","数据目录与授权","医院科研数据目录","展示 HIS、EMR、LIS、PACS、药学等可申请数据域和字段说明。","二期（医院试点）","P0","建议","医院配置","数据域、负责人、敏感等级、更新频率及申请条件可查询。",18],
  ["MRP-AUTH-02","数据目录与授权","项目数据授权申请","按项目目的、字段最小化、伦理状态和使用期限提交数据申请。","二期（医院试点）","P0","建议","标准产品+配置","审批范围、期限和审批人可回读；到期后停止新任务。",18],
  ["MRP-AUTH-03","数据目录与授权","去标识与字段最小化策略","配置直接标识隔离、研究编号、日期偏移、敏感字段屏蔽等策略。","二期（医院试点）","P0","必选","安全专项","分析区无未经批准的直接身份字段，导出前再次扫描。",20],
  ["MRP-AUTH-04","数据目录与授权","授权到期与用途控制","按研究目的、项目、人员、数据域和有效期执行 ABAC。","二期（医院试点）","P0","必选","安全专项","越权和过期访问被拒绝并形成审计事件。",16],

  ["MRP-INGEST-01","数据导入与提取","Excel/CSV/JSON 正式导入","通过统一导入器接收结构化文件，合成数据与真实数据使用同一校验链路。","一期（核心平台）","P0","必选","标准产品","文件批次、哈希、来源、行数、状态和错误均可回读。",24],
  ["MRP-INGEST-02","数据导入与提取","导入模板与字段映射","维护字段名称、类型、代码、单位、时间和目标统一模型映射。","一期（核心平台）","P0","必选","标准产品","映射版本化；映射变化使下游数据集失效。",18],
  ["MRP-INGEST-03","数据导入与提取","文件安全与数据校验","执行白名单、限额、恶意内容、公式注入、编码、日期、单位和代码校验。","一期（核心平台）","P0","必选","安全专项","错误定位至文件/工作表/行/列；失败批次不得部分发布。",20],
  ["MRP-INGEST-04","数据导入与提取","原始快照与批次血缘","保留不可变原始快照、来源系统、提取时间、哈希和标准化过程。","一期（核心平台）","P0","必选","标准产品","任意标准化记录可追溯到原始批次和转换版本。",14],
  ["MRP-INGEST-05","数据导入与提取","在线提取任务管理","对医院只读视图、数据仓库或批准接口执行异步提取、重试和进度查询。","二期（医院试点）","P0","建议","接口实施","任务可取消、重试、去重；失败不产生可用数据集。",22],

  ["MRP-COHORT-01","队列与变量","可视化队列构建器","组合纳排条件、事件先后关系、最短随访、首次用药和持续暴露。","一期（核心平台）","P0","必选","标准产品","队列条件保存为机器可读版本，支持样本计数预览。",28],
  ["MRP-COHORT-02","队列与变量","患者级纳排轨迹","记录每条研究记录的纳入、排除及首个排除原因。","一期（核心平台）","P0","必选","标准产品","纳排日志可导出并与流程图计数一致。",16],
  ["MRP-COHORT-03","队列与变量","代码集与临床概念组","维护诊断、手术、检验、药品等版本化代码集。","一期（核心平台）","P0","必选","标准产品","代码集有来源、版本、审核状态和影响分析。",18],
  ["MRP-COHORT-04","队列与变量","自然语言条件草稿","本地模型将研究描述转换为受控条件草稿，用户确认后生效。","三期（增强扩展）","P1","选配","AI 增强","AI 不执行自由 SQL；所有条件转为受控表达式并留痕。",18],
  ["MRP-VAR-01","队列与变量","变量字典管理","维护变量名称、类型、单位、来源、时间窗、允许值、缺失编码和版本。","一期（核心平台）","P0","必选","标准产品","导出字典与分析数据字段一一对应。",18],
  ["MRP-VAR-02","队列与变量","派生变量与单位转换","以审核公式生成派生变量，记录输入变量、单位换算和执行版本。","一期（核心平台）","P0","必选","标准产品","派生结果可复算，禁止在原始数据上覆盖修改。",20],
  ["MRP-VAR-03","队列与变量","终点判定规则","配置复合终点、时间窗、优先级和判定来源。","一期（核心平台）","P0","必选","标准产品+医学配置","终点可判定率可统计，定义变化使分析失效。",18],

  ["MRP-DQ-01","数据质量与冻结","完整性与缺失矩阵","按变量、时间窗、分组展示缺失率并区分未采集、不适用、未知和失访。","一期（核心平台）","P0","必选","标准产品","关键缺失触发阻断，未知值不得当作正常值。",16],
  ["MRP-DQ-02","数据质量与冻结","重复与引用完整性","识别重复患者/事件/批次、孤立记录和跨表引用缺失。","一期（核心平台）","P0","必选","标准产品","问题可定位、分派、整改和复核。",14],
  ["MRP-DQ-03","数据质量与冻结","范围与时间逻辑校验","检查异常值、单位冲突、日期先后、随访和暴露时间逻辑。","一期（核心平台）","P0","必选","标准产品","规则命中事实、严重度和处理结果可审计。",18],
  ["MRP-DQ-04","数据质量与冻结","分布与数据漂移","比较批次、科室或时间段的分布差异并识别提取异常。","二期（医院试点）","P1","建议","标准产品","漂移告警可追溯到字段、批次和数据源。",14],
  ["MRP-DQ-05","数据质量与冻结","质控问题闭环","问题分派、修复说明、复核、豁免及版本差异。","一期（核心平台）","P0","必选","标准产品","严重问题未关闭不得冻结。",14],
  ["MRP-FREEZE-01","数据质量与冻结","数据集冻结与哈希","生成不可变数据集版本、记录数、字段数、输入版本和 SHA-256。","一期（核心平台）","P0","必选","标准产品","冻结后不可编辑；修改形成新版本。",14],
  ["MRP-FREEZE-02","数据质量与冻结","版本比较与下游失效","比较数据集版本并在上游变更后自动标记旧分析和报告失效。","一期（核心平台）","P0","必选","标准产品","状态衔接真实，页面刷新后不丢失。",16],

  ["MRP-SAP-01","统计分析计划","SAP 编辑与版本审核","定义假设、分析集、方法、效应量、CI、多重比较、缺失、亚组和敏感性分析。","一期（核心平台）","P0","必选","标准产品","未审核 SAP 不得发起正式分析。",24],
  ["MRP-SAP-02","统计分析计划","算法适用性检查","根据结局类型、分布、样本量和研究设计检查统计方法适用条件。","一期（核心平台）","P0","必选","统计专项","不满足条件时阻断或要求统计师确认替代方案。",20],
  ["MRP-SAP-03","统计分析计划","缺失与偏倚控制方案","预设完整病例、多重插补、混杂控制、选择偏倚和敏感性策略。","一期（核心平台）","P0","必选","统计专项","策略在运行前冻结，报告自动披露。",16],
  ["MRP-SAP-04","统计分析计划","统计师电子审核","统计师批准、驳回、批注并锁定 SAP 版本。","一期（核心平台）","P0","必选","标准产品","审核人身份不可伪造，管理员不可跳过。",12],

  ["MRP-AN-01","统计与机器学习","描述统计与基线表","按变量类型输出计数、比例、均值/标准差或中位数/IQR及缺失。","一期（核心平台）","P0","必选","Python/R 工作流","结果含样本量、单位、方法和来源。",20],
  ["MRP-AN-02","统计与机器学习","组间检验与效应量","支持 t、Mann-Whitney U、卡方、Fisher 等及效应量和 95% CI。","一期（核心平台）","P0","必选","Python/R 工作流","方法选择符合数据条件，不仅输出 P 值。",18],
  ["MRP-AN-03","统计与机器学习","回归分析","支持线性、Logistic 和常用广义模型，输出估计、CI 和模型诊断。","一期（核心平台）","P0","必选","Python/R 工作流","共线性、拟合和残差诊断可查看。",24],
  ["MRP-AN-04","统计与机器学习","诊断效能分析","支持 ROC、DeLong、阈值、敏感度、特异度、校准和 DCA。","一期（核心平台）","P0","必选","Python/R 工作流","联合与单指标结果可比较，含 95% CI。",24],
  ["MRP-AN-05","统计与机器学习","生存分析","支持 KM、风险表、log-rank、Cox 和比例风险假设检查。","一期（核心平台）","P0","必选","Python/R 工作流","删失、风险集、HR、CI 和 PH 诊断完整。",26],
  ["MRP-AN-06","统计与机器学习","倾向评分与加权","支持 PSM/IPTW、权重截断、平衡 SMD 和 positivity 诊断。","一期（核心平台）","P0","必选","Python/R 工作流","匹配/加权前后平衡可审计，方法需统计师审核。",28],
  ["MRP-AN-07","统计与机器学习","一致性与方法比较","支持 Kappa、ICC、Bland-Altman 等实验室质量研究方法。","一期（核心平台）","P0","必选","Python/R 工作流","适用尺度、CI 和一致性界限完整。",20],
  ["MRP-AN-08","统计与机器学习","亚组与敏感性分析","按预设亚组、替代定义、权重和缺失策略执行稳健性分析。","一期（核心平台）","P0","必选","Python/R 工作流","所有分析预设并与主分析版本绑定。",22],
  ["MRP-AN-09","统计与机器学习","临床预测模型","支持 LASSO、随机森林等模型、交叉验证、校准和内部验证。","三期（增强扩展）","P1","选配","算法专项","测试集不用于调参；输出 AUC/C-index、校准和过拟合提示。",32],
  ["MRP-AN-10","统计与机器学习","异步任务与运行复现","记录数据、代码、环境、参数、随机种子、日志、结果哈希并支持重试。","一期（核心平台）","P0","必选","标准产品+Worker","同一输入和环境产生可复核结果；失败任务不可发布。",26],

  ["MRP-FIG-01","科研图表引擎","首批 20 类医学图表模板","提供 ROC、KM、森林图、校准、DCA、流程图、热图、Bland-Altman 等模板。","一期（核心平台）","P0","必选","图表专项","至少 20 类模板通过金标准数据和视觉验收。",36],
  ["MRP-FIG-02","科研图表引擎","期刊样式系统","提供通用医学、Nature Portfolio、JAMA、Lancet 和自定义样式预设。","三期（增强扩展）","P1","选配","图表专项","尺寸、字体、线宽、配色和面板布局可配置。",20],
  ["MRP-FIG-03","科研图表引擎","矢量与高分辨率导出","输出 PDF/SVG、600 dpi TIFF、PNG 预览及可选 EPS。","一期（核心平台）","P0","必选","标准产品","各格式内容一致，图表数据和参数同步归档。",16],
  ["MRP-FIG-04","科研图表引擎","受控图表编辑","允许修改标签、尺寸、颜色和布局，不允许改写计算值。","一期（核心平台）","P0","必选","标准产品","图表始终关联分析运行，人工调整可审计。",18],

  ["MRP-REP-01","报告与论文","结构化数据分析报告","生成背景、方法、质量、结果、图表、讨论、局限、结论和复现章节。","一期（核心平台）","P0","必选","报告专项","DOCX/PDF/HTML 与结构化结果一致。",28],
  ["MRP-REP-02","报告与论文","统计数字与图表追溯","报告内关键数字、表格和图可追溯到分析运行和数据集版本。","一期（核心平台）","P0","必选","标准产品","追溯覆盖率 100%，旧结果失效后报告显示过期。",20],
  ["MRP-REP-03","报告与论文","结论边界与质量检查","识别因果夸大、无分母推发生率、只看 P 值、遗漏局限等问题。","一期（核心平台）","P0","必选","规则+AI","证据不足时明确阻断，不补写结论。",18],
  ["MRP-MAN-01","报告与论文","IMRaD 论文写作工作台","按引言、方法、结果、讨论组织已审核内容、表图和修改历史。","一期（核心平台）","P0","建议","标准产品","论文草稿与报告版本绑定，统计值不可自由编辑。",26],
  ["MRP-MAN-02","报告与论文","本地模型写作辅助","基于已审核协议和结果生成摘要、段落草稿、润色和一致性检查。","一期（核心平台）","P0","建议","AI 增强","无模型时可降级；不得生成虚假数值和引用。",24],
  ["MRP-MAN-03","报告与论文","真实文献引用核验","管理文献元数据、引用定位、待核验状态和重复引用。","三期（增强扩展）","P1","选配","知识专项","未核验引用不得进入正式发布版本。",20],
  ["MRP-MAN-04","报告与论文","中英文双语成果","提供报告与论文草稿双语版本和术语一致性检查。","三期（增强扩展）","P2","选配","AI 增强","双语内容保留同一统计来源和版本。",24],

  ["MRP-REV-01","审核与协作","四级审核工作流","项目负责人、统计师、医学负责人、科研管理依次审核。","一期（核心平台）","P0","必选","标准产品","跳级、越权和伪造审核被拒绝并审计。",22],
  ["MRP-REV-02","审核与协作","批注、分派与整改闭环","支持段落/表图批注、负责人、期限、驳回、重提和差异查看。","一期（核心平台）","P0","必选","标准产品","审核意见只追加；问题全部关闭后方可推进。",18],
  ["MRP-REV-03","审核与协作","发布门禁与电子确认","核验伦理、作者、数据声明、统计审核、医学审核和敏感信息。","一期（核心平台）","P0","必选","安全专项","阻断项不可由超级管理员绕过。",16],

  ["MRP-EXP-01","成果包与归档","可复现 ZIP 成果包","导出协议、数据、字典、质控、SAP、代码、环境、结果、图表、报告、审核和审计。","一期（核心平台）","P0","必选","导出专项","ZIP 清单完整、可解压、可复现且无直接身份字段。",26],
  ["MRP-EXP-02","成果包与归档","清单、哈希与签名","生成 manifest、文件字节数、SHA-256 和发布状态。","一期（核心平台）","P0","必选","标准产品","制品哈希可独立复核，失败导出不可标记为发布。",14],
  ["MRP-EXP-03","成果包与归档","版本归档与回读","长期归档冻结数据、分析、报告、审核和导出包，支持版本回读。","二期（医院试点）","P0","建议","医院配置","归档策略符合医院制度，回读后版本关系完整。",16],
  ["MRP-EXP-04","成果包与归档","下载授权与水印","区分工作包与发布包，执行下载审批、水印、到期和审计。","一期（核心平台）","P0","必选","安全专项","未终审只能导出带水印工作包。",14],

  ["MRP-KNOW-01","知识与模板中心","研究模板与方法中心","管理研究协议、变量、SAP、图表和报告模板的发布、替换、撤回。","二期（医院试点）","P1","建议","标准产品","模板有版本、来源、审核状态和适用范围。",20],
  ["MRP-KNOW-02","知识与模板中心","文献与院内规范知识库","存储真实文献元数据、医院方法学规范和可定位证据。","二期（医院试点）","P1","建议","知识专项","未审核资料不得进入正式报告生成。",22],
  ["MRP-KNOW-03","知识与模板中心","模板运营与复用分析","统计模板使用、成功率、退回原因和维护待办。","三期（增强扩展）","P2","选配","标准产品","只展示治理指标，不将采纳自动升级为科研方法规则。",14],

  ["MRP-AI-01","医学 AI 智能体","统一模型网关","统一接入医院本地 DeepSeek R1，管理模型、参数、超时、审计和降级。","一期（核心平台）","P0","必选","AI 基础设施","无密钥写入前端；模型不可直接访问数据库或发布状态。",24],
  ["MRP-AI-02","医学 AI 智能体","结构化智能体编排","将选题、变量建议、方法解释、报告草稿拆为受控 Schema 步骤。","一期（核心平台）","P0","建议","AI 基础设施","每步输入输出可验证、可回放、可拒绝。",28],
  ["MRP-AI-03","医学 AI 智能体","受控检索与证据定位","仅检索已发布知识和项目获授权材料，返回来源与定位。","二期（医院试点）","P1","建议","AI+知识专项","证据不足或冲突必须显式提示。",24],
  ["MRP-AI-04","医学 AI 智能体","模型质量评测集","建立研究设计、方法、解释、引用、隐私和越界案例回归评测。","二期（医院试点）","P0","必选","AI 安全专项","不少于 100 个基准案例，模型升级前强制回归。",24],
  ["MRP-AI-05","医学 AI 智能体","提示注入与越权防护","隔离不可信文档指令，限制工具、数据域和输出动作。","二期（医院试点）","P0","必选","AI 安全专项","对抗测试中无未授权数据读取和发布动作。",18],

  ["MRP-SYS-01","平台基础与安全","统一身份与医院 SSO 适配","支持模拟身份开发模式及医院 OIDC/SSO 适配。","一期（核心平台）","P0","必选","基础平台","正式环境身份来自医院认证，前端角色切换不构成授权。",22],
  ["MRP-SYS-02","平台基础与安全","RBAC+ABAC 权限","按用户、角色、科室、项目、数据域、目的、伦理状态和期限授权。","一期（核心平台）","P0","必选","安全专项","覆盖页面、接口、数据行列、任务和制品下载。",28],
  ["MRP-SYS-03","平台基础与安全","追加式审计中心","记录登录、查看、修改、运行、审核、导出和管理配置。","一期（核心平台）","P0","必选","基础平台","审计不可物理删除，支持关联 ID 和合规查询。",22],
  ["MRP-SYS-04","平台基础与安全","可靠任务与 Worker 管理","基于 PostgreSQL 可靠任务表执行提取、分析、图表、报告和导出。","一期（核心平台）","P0","必选","基础平台","任务租约、重试、死信、取消和幂等完整。",24],
  ["MRP-SYS-05","平台基础与安全","BlobStorage 制品存储","开发环境本地目录，医院可替换 NAS/对象存储。","一期（核心平台）","P0","必选","基础平台","文件元数据、权限、哈希和生命周期可管理。",16],
  ["MRP-SYS-06","平台基础与安全","日志、监控与告警","服务健康、队列积压、失败率、容量、授权到期和资源监控。","二期（医院试点）","P0","必选","运维实施","敏感信息不进入日志，关键告警可验证。",20],
  ["MRP-SYS-07","平台基础与安全","备份恢复与容灾演练","数据库、制品、审计和配置备份，提供恢复脚本与演练。","二期（医院试点）","P0","必选","运维实施","达到试点 RPO/RTO 并形成恢复报告。",18],
  ["MRP-SYS-08","平台基础与安全","配置、字典与代码集","统一管理业务参数、医院字典、代码映射和版本。","一期（核心平台）","P0","必选","基础平台","配置变更留痕，高风险配置可双人复核。",18],
  ["MRP-SYS-09","平台基础与安全","OpenAPI 与页面接口文档","每个页面提供角色、字段、状态、错误、幂等、审计和联调示例。","一期（核心平台）","P0","必选","开发交付","页面文档与 OpenAPI 契约测试一致。",22],
  ["MRP-SYS-10","平台基础与安全","自动化测试与交付验收","Java、Python、Vue、契约、Playwright、安全、性能、一致性和恢复测试。","一期（核心平台）","P0","必选","质量保障","提供实际命令、通过/失败数、接口、数据库、制品和页面证据。",36],
  ["MRP-SYS-11","平台基础与安全","内网容器部署与培训","Linux x86_64 容器部署、环境配置、管理员/用户培训和试运行支持。","二期（医院试点）","P0","必选","实施服务","医院环境可启动、监控、备份和升级；培训材料完整。",26],
  ["MRP-SYS-12","平台基础与安全","多院区/多机构运营","支持机构隔离、机构级模板、配额、指标和统一运营。","三期（增强扩展）","P2","选配","平台扩展","机构间数据默认隔离，授权共享有审计。",28],

  ["MRP-INT-01","医院数据接口","HIS 科研数据适配","对接人口学、就诊、诊断、医嘱、费用等获批只读数据。","二期（医院试点）","P0","建议","接口实施","完成字段映射、增量/批量策略、失败补偿和对账。",30],
  ["MRP-INT-02","医院数据接口","EMR 科研数据适配","对接结构化病历字段及医院批准的文本抽取结果。","二期（医院试点）","P0","建议","接口实施","明确文书版本、时间、来源和抽取质量边界。",32],
  ["MRP-INT-03","医院数据接口","LIS 科研数据适配","对接检验项目、结果、单位、参考范围、标本和时间。","二期（医院试点）","P0","建议","接口实施","单位与代码映射可追溯，异常和重复事件可处理。",28],
  ["MRP-INT-04","医院数据接口","药学系统数据适配","对接药品目录、用药暴露、审核、不良反应和药学服务数据。","二期（医院试点）","P0","建议","接口实施","暴露起止、停用、跨科室和目录版本可计算。",28],
  ["MRP-INT-05","医院数据接口","PACS 元数据适配","对接影像检查元数据和报告索引，首版不含影像 AI。","三期（增强扩展）","P2","选配","接口实施","仅提取获批字段，影像文件与算法另行报价。",24],
  ["MRP-INT-06","医院数据接口","随访/专病库适配","对接院内随访或专病库的结局和量表数据。","三期（增强扩展）","P2","选配","接口实施","按实际系统和字段范围专项评估。",24],
];

const params = wb.worksheets.add("报价参数");
const summary = wb.worksheets.add("商务报价总览");
const list = wb.worksheets.add("功能模块选择清单");
const phases = wb.worksheets.add("分期范围汇总");
const foundations = wb.worksheets.add("公共基础能力");
const interfaces = wb.worksheets.add("数据接口与实施");
const terms = wb.worksheets.add("报价边界与条款");

for (const sheet of [params, summary, list, phases, foundations, interfaces, terms]) sheet.showGridLines = false;

function title(sheet, range, text) {
  sheet.getRange(range).merge();
  sheet.getRange(range).values = [[text]];
  sheet.getRange(range).format = { fill: navy, font: { bold: true, color: white, size: 18 }, horizontalAlignment: "center", verticalAlignment: "center" };
  sheet.getRange(range).format.rowHeight = 34;
}

function section(sheet, range, text) {
  sheet.getRange(range).merge();
  sheet.getRange(range).values = [[text]];
  sheet.getRange(range).format = { fill: lightBlue, font: { bold: true, color: navy, size: 12 }, verticalAlignment: "center" };
  sheet.getRange(range).format.rowHeight = 24;
}

function header(range) {
  range.format = { fill: blue, font: { bold: true, color: white }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: line } };
  range.format.rowHeight = 30;
}

// 报价参数
title(params, "A1:D1", "HospitalAI 医学科研智能平台报价参数");
params.getRange("A2:D2").merge();
params.getRange("A2:D2").values = [["黄色单元格为商务可调整参数；本表为谈判测算底稿，最终价格以双方确认的范围、接口现状和合同为准。"]];
params.getRange("A2:D2").format = { fill: gray, font: { color: "#546E7A" }, wrapText: true };
params.getRange("A4:D4").values = [["参数","建议值","单位/选项","说明"]];
header(params.getRange("A4:D4"));
params.getRange("A5:D12").values = [
  ["综合人日单价",3200,"元/人日","包含产品、研发、测试、项目管理等综合测算，不代表市场统一价格。"],
  ["商务折扣系数",0.92,"系数","谈判折扣，可调整为 0.80-1.00。"],
  ["增值税率",0.06,"比例","按拟采用的合同及发票类型由财务确认。"],
  ["免费质保期",12,"月","自项目终验之日起计算。"],
  ["质保后年运维费率",0.15,"软件合同额比例","不含服务器、GPU、第三方软件和专项科研服务。"],
  ["报价有效期",30,"天","自正式报价单签发日起计算。"],
  ["一期计划周期",14,"周","以需求冻结、环境就绪和甲方配合及时为前提。"],
  ["二期计划周期",16,"周","接口周期需在现场调研后校准。"],
];
params.getRange("B5:B12").format.fill = yellow;
params.getRange("B5").format.numberFormat = "¥#,##0";
params.getRange("B6:B7").format.numberFormat = "0.0%";
params.getRange("B9").format.numberFormat = "0.0%";
params.getRange("A5:D12").format.borders = { preset: "all", style: "thin", color: line };
params.getRange("A5:D12").format.wrapText = true;
params.getRange("A5:A12").format.font = { bold: true, color: dark };
params.getRange("A14:D14").values = [["取值说明","系统默认","可谈判调整","不建议调整"]];
header(params.getRange("A14:D14"));
params.getRange("A15:D17").values = [
  ["功能选择","纳入","纳入 / 待议 / 暂缓","必选项原则上不应暂缓"],
  ["分期原则","核心平台 -> 医院试点 -> 增强扩展","可按预算拆分里程碑","不可拆断数据、统计、审核和审计主链路"],
  ["价格口径","含税建议金额","可调整单价、折扣、税率和功能选择","第三方费用另计"],
];
params.getRange("A15:D17").format = { borders: { preset: "all", style: "thin", color: line }, wrapText: true };
params.getRange("A:A").format.columnWidth = 24;
params.getRange("B:B").format.columnWidth = 18;
params.getRange("C:C").format.columnWidth = 20;
params.getRange("D:D").format.columnWidth = 58;
params.freezePanes.freezeRows(4);

// 功能模块选择清单
title(list, "A1:M1", "HospitalAI 医学科研智能平台功能选择清单");
list.getRange("A2:M2").merge();
list.getRange("A2:M2").values = [["分期原则：一期完成文件数据到科研成果包的可运行闭环；二期完成医院数据接入和真实项目试点；三期扩展高阶算法、期刊样式和规模化运营。"]];
list.getRange("A2:M2").format = { fill: gray, font: { color: "#546E7A" }, wrapText: true };
list.getRange("A3:D3").merge(); list.getRange("A3:D3").values = [["一期：核心平台与文件科研闭环"]]; list.getRange("A3:D3").format = { fill: phase1, font: { bold: true }, horizontalAlignment: "center" };
list.getRange("E3:H3").merge(); list.getRange("E3:H3").values = [["二期：医院数据接入与真实项目试点"]]; list.getRange("E3:H3").format = { fill: phase2, font: { bold: true }, horizontalAlignment: "center" };
list.getRange("I3:M3").merge(); list.getRange("I3:M3").values = [["三期：智能增强与规模化"]]; list.getRange("I3:M3").format = { fill: phase3, font: { bold: true }, horizontalAlignment: "center" };
list.getRange("A5:M5").values = [["需求编号","一级模块","二级功能","功能与交付说明","实施阶段","优先级","采购建议","交付形态","验收要点","估算人日","单项含税建议金额（万元）","甲方选择","甲方备注"]];
header(list.getRange("A5:M5"));
const dataStart = 6;
const dataEnd = dataStart + requirements.length - 1;
const listValues = requirements.map((row) => [...row, null, row[6] === "选配" ? "待议" : "纳入", null]);
list.getRange(`A${dataStart}:M${dataEnd}`).values = listValues;
for (let row = dataStart; row <= dataEnd; row += 1) {
  list.getRange(`K${row}`).formulas = [[`=J${row}*'报价参数'!$B$5*'报价参数'!$B$6*(1+'报价参数'!$B$7)/10000`]];
  const phase = requirements[row - dataStart][4];
  list.getRange(`A${row}:M${row}`).format.fill = phaseFill[phase];
}
list.getRange(`A${dataStart}:M${dataEnd}`).format = { borders: { preset: "all", style: "thin", color: line }, verticalAlignment: "center" };
list.getRange(`C${dataStart}:I${dataEnd}`).format.wrapText = true;
list.getRange(`K${dataStart}:K${dataEnd}`).format.numberFormat = "0.00";
list.getRange(`J${dataStart}:K${dataEnd}`).format.horizontalAlignment = "right";
list.getRange(`L${dataStart}:M${dataEnd}`).format.fill = yellow;
list.getRange(`L${dataStart}:L${dataEnd}`).dataValidation = { rule: { type: "list", values: ["纳入","待议","暂缓"] } };
list.getRange(`E${dataStart}:E${dataEnd}`).dataValidation = { rule: { type: "list", values: ["一期（核心平台）","二期（医院试点）","三期（增强扩展）"] } };
list.getRange(`F${dataStart}:F${dataEnd}`).dataValidation = { rule: { type: "list", values: ["P0","P1","P2"] } };
list.getRange(`A${dataEnd + 1}:I${dataEnd + 1}`).merge();
list.getRange(`A${dataEnd + 1}:I${dataEnd + 1}`).values = [["已纳入功能合计（待议/暂缓项不进入合同建议总价）"]];
list.getRange(`J${dataEnd + 1}`).formulas = [[`=SUMIF(L${dataStart}:L${dataEnd},"纳入",J${dataStart}:J${dataEnd})`]];
list.getRange(`K${dataEnd + 1}`).formulas = [[`=SUMIF(L${dataStart}:L${dataEnd},"纳入",K${dataStart}:K${dataEnd})`]];
list.getRange(`L${dataEnd + 1}:M${dataEnd + 1}`).merge();
list.getRange(`A${dataEnd + 1}:M${dataEnd + 1}`).format = { fill: green, font: { bold: true, color: dark }, borders: { preset: "doubleBottom", style: "medium", color: navy } };
list.getRange(`K${dataEnd + 1}`).format.numberFormat = "0.00";
const widths = [18,22,28,56,20,10,12,18,55,12,18,12,28];
for (let i = 0; i < widths.length; i += 1) list.getRangeByIndexes(0, i, dataEnd + 2, 1).format.columnWidth = widths[i];
list.getRange(`A${dataStart}:M${dataEnd}`).format.rowHeight = 44;
list.freezePanes.freezeRows(5);
list.freezePanes.freezeColumns(3);
const table = list.tables.add(`A5:M${dataEnd}`, true, "ResearchFeatureSelection");

// 商务报价总览
title(summary, "A1:H1", "HospitalAI 医学科研智能平台分期报价建议");
summary.getRange("A2:H2").merge();
summary.getRange("A2:H2").values = [["本报价依据 V1.0 PRD 和当前确认范围形成，作为医院谈判与预算测算底稿。最终报价需在现场数据源、接口、算力、安全制度和验收标准调研后确认。"]];
summary.getRange("A2:H2").format = { fill: gray, font: { color: "#546E7A" }, wrapText: true };
summary.getRange("A4:B4").values = [["建议含税总价（万元）",null]];
summary.getRange("B4").formulas = [[`=SUM(E8:E10)`]];
summary.getRange("A4:B4").format = { fill: green, font: { bold: true, color: "#2E5B31", size: 15 }, borders: { preset: "outside", style: "medium", color: "#7DAA7A" } };
summary.getRange("B4").format.numberFormat = "0.00";
summary.getRange("D4:E4").values = [["总估算人日",null]];
summary.getRange("E4").formulas = [[`=SUM(D8:D10)`]];
summary.getRange("D4:E4").format = { fill: lightBlue, font: { bold: true, color: navy, size: 14 }, borders: { preset: "outside", style: "medium", color: blue } };
summary.getRange("G4:H4").values = [["质保后年运维费（万元）",null]];
summary.getRange("H4").formulas = [[`=B4*'报价参数'!$B$9`]];
summary.getRange("G4:H4").format = { fill: yellow, font: { bold: true, color: "#7A5B00", size: 13 }, borders: { preset: "outside", style: "medium", color: "#D6B656" } };
summary.getRange("H4").format.numberFormat = "0.00";
summary.getRange("A7:H7").values = [["实施阶段","主要建设内容","采购定位","估算人日","含税金额（万元）","占总价比例","建议周期","商务备注"]];
header(summary.getRange("A7:H7"));
summary.getRange("A8:C10").values = [
  ["一期（核心平台）","文件导入、项目/协议、队列变量、质控冻结、SAP、确定性统计、图表、报告、审核、ZIP、权限审计","必须先做"],
  ["二期（医院试点）","HIS/EMR/LIS/药学接口、数据授权、知识库、模型评测、监控容灾、真实项目试点","上线试点"],
  ["三期（增强扩展）","高阶预测模型、期刊样式、双语、院内查重、多机构、PACS/随访适配","按需选配"],
];
for (let row = 8; row <= 10; row += 1) {
  const phaseName = summary.getRange(`A${row}`).values[0][0];
  summary.getRange(`D${row}`).formulas = [[`=SUMIFS('功能模块选择清单'!$J$${dataStart}:$J$${dataEnd},'功能模块选择清单'!$E$${dataStart}:$E$${dataEnd},A${row},'功能模块选择清单'!$L$${dataStart}:$L$${dataEnd},"纳入")`]];
  summary.getRange(`E${row}`).formulas = [[`=SUMIFS('功能模块选择清单'!$K$${dataStart}:$K$${dataEnd},'功能模块选择清单'!$E$${dataStart}:$E$${dataEnd},A${row},'功能模块选择清单'!$L$${dataStart}:$L$${dataEnd},"纳入")`]];
  summary.getRange(`F${row}`).formulas = [[`=IF($B$4=0,0,E${row}/$B$4)`]];
  summary.getRange(`A${row}:H${row}`).format.fill = phaseFill[phaseName];
}
summary.getRange("G8:G10").values = [["约 14 周"],["约 16 周"],["按选配范围评估"]];
summary.getRange("H8:H10").values = [["建议首批合同锁定"],["一期验收后启动"],["真实试点稳定后启动"]];
summary.getRange("A11:C11").merge(); summary.getRange("A11:C11").values = [["合计"]];
summary.getRange("D11").formulas = [["=SUM(D8:D10)"]];
summary.getRange("E11").formulas = [["=SUM(E8:E10)"]];
summary.getRange("F11").formulas = [["=SUM(F8:F10)"]];
summary.getRange("A11:H11").format = { fill: green, font: { bold: true }, borders: { preset: "doubleBottom", style: "medium", color: navy } };
summary.getRange("E8:E11").format.numberFormat = "0.00";
summary.getRange("F8:F11").format.numberFormat = "0.0%";
summary.getRange("A7:H11").format.borders = { preset: "all", style: "thin", color: line };
summary.getRange("A8:H10").format.wrapText = true;
section(summary, "A14:H14", "建议付款里程碑（可谈判）");
summary.getRange("A15:H15").values = [["里程碑","合同签订","需求/设计冻结","核心功能验收","试点上线","终验与资料移交","合计","说明"]];
header(summary.getRange("A15:H15"));
summary.getRange("A16:H16").values = [["付款比例",0.2,0.2,0.25,0.2,0.15,null,"各阶段均以书面验收和问题闭环为付款条件。"]];
summary.getRange("G16").formulas = [["=SUM(B16:F16)"]];
summary.getRange("B16:G16").format.numberFormat = "0%";
summary.getRange("A15:H16").format.borders = { preset: "all", style: "thin", color: line };
section(summary, "A19:H19", "谈判提示");
summary.getRange("A20:H24").values = [
  ["1","优先锁定一期完整主链路，避免只采购页面或单个算法而无法形成科研成果闭环。",null,null,null,null,null,null],
  ["2","医院接口按系统数量、数据质量、厂商配合、字段范围和历史数据量现场复核；接口厂商费用不在本测算内。",null,null,null,null,null,null],
  ["3","平台交付的是研究生产与质量控制能力，不承诺论文录用、职称结果或医学结论成立。",null,null,null,null,null,null],
  ["4","真实项目需由医院完成伦理、数据授权、医学与统计审核；供应方可另行提供专项科研服务包。",null,null,null,null,null,null],
  ["5","服务器、GPU、操作系统/数据库商业许可、本地模型及第三方文献数据库费用由双方另行确认。",null,null,null,null,null,null],
];
for (let r = 20; r <= 24; r += 1) summary.getRange(`B${r}:H${r}`).merge();
summary.getRange("A20:H24").format = { fill: "#FFF8E7", wrapText: true, borders: { preset: "inside", style: "thin", color: "#E5D7A7" } };
summary.getRange("A:A").format.columnWidth = 24; summary.getRange("B:B").format.columnWidth = 58; summary.getRange("C:C").format.columnWidth = 16; summary.getRange("D:F").format.columnWidth = 16; summary.getRange("G:G").format.columnWidth = 28; summary.getRange("H:H").format.columnWidth = 22;
summary.getRange("A8:H10").format.rowHeight = 54;
summary.freezePanes.freezeRows(7);

// 图表数据在 J:K，来源为摘要公式
summary.getRange("J6:K6").values = [["阶段","含税金额（万元）"]];
summary.getRange("J7:J9").formulas = [["=A8"],["=A9"],["=A10"]];
summary.getRange("K7:K9").formulas = [["=E8"],["=E9"],["=E10"]];
const chart = summary.charts.add("column", summary.getRange("J6:K9"));
chart.title = "各阶段建议报价（万元）";
chart.hasLegend = false;
chart.yAxis = { numberFormatCode: "0.0" };
chart.setPosition("J1", "Q15");

// 分期范围汇总
title(phases, "A1:G1", "科研平台分期范围与模块汇总");
phases.getRange("A3:G3").values = [["实施阶段","模块数","已纳入项","待议项","暂缓项","估算人日","含税金额（万元）"]];
header(phases.getRange("A3:G3"));
phases.getRange("A4:A6").values = [["一期（核心平台）"],["二期（医院试点）"],["三期（增强扩展）"]];
for (let r = 4; r <= 6; r += 1) {
  phases.getRange(`B${r}`).formulas = [[`=COUNTIF('功能模块选择清单'!$E$${dataStart}:$E$${dataEnd},A${r})`]];
  phases.getRange(`C${r}`).formulas = [[`=COUNTIFS('功能模块选择清单'!$E$${dataStart}:$E$${dataEnd},A${r},'功能模块选择清单'!$L$${dataStart}:$L$${dataEnd},"纳入")`]];
  phases.getRange(`D${r}`).formulas = [[`=COUNTIFS('功能模块选择清单'!$E$${dataStart}:$E$${dataEnd},A${r},'功能模块选择清单'!$L$${dataStart}:$L$${dataEnd},"待议")`]];
  phases.getRange(`E${r}`).formulas = [[`=COUNTIFS('功能模块选择清单'!$E$${dataStart}:$E$${dataEnd},A${r},'功能模块选择清单'!$L$${dataStart}:$L$${dataEnd},"暂缓")`]];
  phases.getRange(`F${r}`).formulas = [[`=SUMIFS('功能模块选择清单'!$J$${dataStart}:$J$${dataEnd},'功能模块选择清单'!$E$${dataStart}:$E$${dataEnd},A${r},'功能模块选择清单'!$L$${dataStart}:$L$${dataEnd},"纳入")`]];
  phases.getRange(`G${r}`).formulas = [[`=SUMIFS('功能模块选择清单'!$K$${dataStart}:$K$${dataEnd},'功能模块选择清单'!$E$${dataStart}:$E$${dataEnd},A${r},'功能模块选择清单'!$L$${dataStart}:$L$${dataEnd},"纳入")`]];
  phases.getRange(`A${r}:G${r}`).format.fill = phaseFill[phases.getRange(`A${r}`).values[0][0]];
}
phases.getRange("A7").values = [["合计"]];
for (const c of ["B","C","D","E","F","G"]) phases.getRange(`${c}7`).formulas = [[`=SUM(${c}4:${c}6)`]];
phases.getRange("A7:G7").format = { fill: green, font: { bold: true }, borders: { preset: "doubleBottom", style: "medium", color: navy } };
phases.getRange("G4:G7").format.numberFormat = "0.00";
phases.getRange("A3:G7").format.borders = { preset: "all", style: "thin", color: line };
section(phases, "A10:G10", "分期采购建议");
phases.getRange("A11:G14").values = [
  ["优先级 1","一期必须形成数据导入、队列、质控冻结、统计、图表、报告、审核和 ZIP 的完整闭环。",null,null,null,null,null],
  ["优先级 2","二期以真实医院数据链路和 5-10 个真实研究项目验证为核心，不以接口数量替代研究验收。",null,null,null,null,null],
  ["优先级 3","三期按目标期刊、科室扩展、多机构和高阶算法实际需求选配。",null,null,null,null,null],
  ["不可拆项","权限、审计、数据冻结、SAP 审核、结果追溯和发布门禁属于医学科研质量底座，不建议单独删减。",null,null,null,null,null],
];
for (let r = 11; r <= 14; r += 1) phases.getRange(`B${r}:G${r}`).merge();
phases.getRange("A11:G14").format = { wrapText: true, borders: { preset: "inside", style: "thin", color: line } };
phases.getRange("A:A").format.columnWidth = 22; phases.getRange("B:E").format.columnWidth = 14; phases.getRange("F:G").format.columnWidth = 18;

// 公共基础能力
title(foundations, "A1:E1", "公共基础能力（一期/二期必须建设）");
foundations.getRange("A2:E2").merge(); foundations.getRange("A2:E2").values = [["以下能力是科研项目合规运行和可交付验收的共同底座，不建议按普通可选功能拆散。"]]; foundations.getRange("A2:E2").format = { fill: gray, font: { color: "#546E7A" } };
foundations.getRange("A4:E4").values = [["序号","基础能力","建议阶段","不可省略原因","对应需求"]]; header(foundations.getRange("A4:E4"));
const foundationRows = [
  [1,"统一身份认证与医院 SSO","一期","确保审核人与操作者身份真实，前端角色切换不能替代授权。","MRP-SYS-01"],
  [2,"RBAC + ABAC 权限","一期","科研数据需按项目、目的、数据域、伦理和期限控制。","MRP-SYS-02"],
  [3,"追加式审计","一期","满足数据查看、分析、审核、导出和配置变更追溯。","MRP-SYS-03"],
  [4,"可靠异步任务","一期","提取、分析、图表、报告和导出必须支持重试、幂等和失败隔离。","MRP-SYS-04"],
  [5,"制品与附件存储","一期","报告、图表、数据包、协议和审计需版本化保存。","MRP-SYS-05"],
  [6,"参数、字典和代码集","一期","医院代码、单位、研究模板和算法配置需统一版本治理。","MRP-SYS-08"],
  [7,"统一 OpenAPI 与接口文档","一期","保证前后端、适配器和后续医院对接可验收。","MRP-SYS-09"],
  [8,"自动化测试与质量门禁","一期","不能以页面展示或编译通过代替真实流程验收。","MRP-SYS-10"],
  [9,"日志、监控和告警","二期","真实数据试点需要任务、容量、失败率和权限到期监控。","MRP-SYS-06"],
  [10,"备份恢复与容灾演练","二期","正式科研数据、分析制品和审计必须可恢复。","MRP-SYS-07"],
  [11,"内网容器部署与培训","二期","确保医院可运行、维护、备份、升级和使用。","MRP-SYS-11"],
  [12,"隐私、脱敏和导出扫描","二期","避免直接身份信息进入分析区或成果包。","MRP-AUTH-03"],
];
foundations.getRange(`A5:E${4 + foundationRows.length}`).values = foundationRows;
foundations.getRange(`A5:E${4 + foundationRows.length}`).format = { borders: { preset: "all", style: "thin", color: line }, wrapText: true, verticalAlignment: "center" };
foundations.getRange(`A5:E${11}`).format.fill = phase1;
foundations.getRange(`A12:E${4 + foundationRows.length}`).format.fill = phase2;
foundations.getRange("A:A").format.columnWidth = 10; foundations.getRange("B:B").format.columnWidth = 30; foundations.getRange("C:C").format.columnWidth = 14; foundations.getRange("D:D").format.columnWidth = 64; foundations.getRange("E:E").format.columnWidth = 18;
foundations.freezePanes.freezeRows(4);

// 数据接口与实施
title(interfaces, "A1:H1", "医院数据接口与现场实施边界");
interfaces.getRange("A2:H2").merge(); interfaces.getRange("A2:H2").values = [["接口报价为标准工作量测算。医院系统数量、厂商配合、字段质量、历史数据量、网络与安全审批差异较大，正式合同前必须完成现场调研。"]]; interfaces.getRange("A2:H2").format = { fill: yellow, font: { color: "#7A5B00" }, wrapText: true };
interfaces.getRange("A4:H4").values = [["接口/实施项","默认阶段","采购建议","标准范围","甲方前置条件","不含范围","对应需求","商务处理"]]; header(interfaces.getRange("A4:H4"));
const interfaceRows = [
  ["HIS 科研数据适配","二期","建议","人口学、就诊、诊断、医嘱、费用的获批只读字段","提供接口文档、测试环境、厂商联系人和数据字典","HIS 厂商收费、业务系统改造、写回","MRP-INT-01","标准范围内纳入二期"],
  ["EMR 科研数据适配","二期","建议","结构化病历字段和批准的文本抽取结果","明确病历版本、文书范围和抽取规则","通用病历 NLP 大模型训练、全量历史文书治理","MRP-INT-02","现场评估后锁定"],
  ["LIS 科研数据适配","二期","建议","检验结果、单位、参考范围、标本和时间","提供项目代码、单位字典和异常值规则","设备直连、LIS 厂商收费","MRP-INT-03","标准范围内纳入二期"],
  ["药学系统数据适配","二期","建议","药品目录、用药暴露、审核、不良反应","提供药品编码、停用/长期医嘱和科室规则","处方写回、临床决策系统改造","MRP-INT-04","标准范围内纳入二期"],
  ["PACS 元数据适配","三期","选配","检查元数据和报告索引","提供 DICOM/接口规范及影像权限","影像文件治理、标注和影像 AI","MRP-INT-05","单独确认范围"],
  ["随访/专病库适配","三期","选配","结局、量表和随访时间的获批字段","提供数据模型和质量说明","新增随访系统建设","MRP-INT-06","按系统单独报价"],
  ["本地 DeepSeek R1 网关","一期/二期","建议","对接既有 OpenAI 兼容或医院批准接口","医院提供模型服务、算力、并发和安全策略","GPU、模型训练、商业模型许可","MRP-AI-01","平台适配纳入，算力另计"],
  ["真实项目试点服务","二期","建议","3 类模板、2-3 科室、5-10 个项目的方法和流程验证","医院提供 PI、统计师、医学负责人和伦理授权","代写论文、保证发表、无限次专项分析","试点验收","可拆分专项服务包"],
];
interfaces.getRange("A5:H12").values = interfaceRows;
interfaces.getRange("A5:H12").format = { borders: { preset: "all", style: "thin", color: line }, wrapText: true, verticalAlignment: "center" };
interfaces.getRange("A5:H12").format.rowHeight = 62;
const interfaceWidths = [24,14,12,42,42,42,18,28];
for (let i = 0; i < interfaceWidths.length; i += 1) interfaces.getRangeByIndexes(0,i,13,1).format.columnWidth = interfaceWidths[i];
interfaces.freezePanes.freezeRows(4);

// 报价边界与条款
title(terms, "A1:F1", "报价边界、交付物与商务条款建议");
section(terms, "A3:F3", "一、报价默认包含");
const included = [
  [1,"产品与需求","已确认范围的产品设计、需求规格、状态机和需求追踪矩阵。"],
  [2,"软件交付","所选标准模块的前端、Core API、AI/统计服务、数据库迁移和部署配置。"],
  [3,"质量保障","单元、契约、集成、E2E、安全、性能、数据一致性和恢复测试。"],
  [4,"文档","页面接口文档、OpenAPI、部署、运维、备份恢复、用户和验收手册。"],
  [5,"实施与培训","约定范围内安装部署、管理员培训、关键用户培训和试运行支持。"],
  [6,"质保","终验后免费质保期内的软件缺陷修复，不含新增需求和外部环境变化。"],
];
terms.getRange("A4:C9").values = included;
terms.getRange("A4:C9").format = { borders: { preset: "all", style: "thin", color: line }, wrapText: true };
section(terms, "A11:F11", "二、默认不包含/需另行确认");
const excluded = [
  [1,"基础设施","服务器、GPU、存储、网络、安全设备、操作系统和数据库商业许可。"],
  [2,"第三方费用","HIS/EMR/LIS/PACS 厂商接口费、短信、电子签名、文献数据库和商业模型费用。"],
  [3,"数据整改","医院历史数据大规模补录、人工标注、全院主数据治理和源系统改造。"],
  [4,"科研服务","代写论文、投稿代理、版面费、伦理申请、注册、统计师/医学专家无限次服务。"],
  [5,"高阶范围","组学、影像 AI、临床试验 EDC、多中心联邦分析、Meta 分析和自动投稿。"],
  [6,"结果承诺","论文录用、影响因子、职称评审结果、临床结论成立或科研奖项。"],
];
terms.getRange("A12:C17").values = excluded;
terms.getRange("A12:C17").format = { borders: { preset: "all", style: "thin", color: line }, wrapText: true, fill: "#FFF3F1" };
section(terms, "A19:F19", "三、范围与变更控制");
terms.getRange("A20:F24").values = [
  ["1","双方以本功能清单、PRD、接口清单和验收标准作为合同范围附件。",null,null,null,null],
  ["2","需求编号不变的缺陷修复属于原范围；新增业务目标、数据源、算法、报表或角色属于变更评估。",null,null,null,null],
  ["3","接口在现场调研后形成字段映射和边界确认单；外部系统变化导致的返工另行评估。",null,null,null,null],
  ["4","甲方延迟提供环境、数据、接口、专家审核或安全审批时，项目计划相应顺延。",null,null,null,null],
  ["5","任何合成数据演示结果均不构成真实科研证据；真实项目需通过专业审核和发布门禁。",null,null,null,null],
];
for (let r = 20; r <= 24; r += 1) terms.getRange(`B${r}:F${r}`).merge();
terms.getRange("A20:F24").format = { borders: { preset: "inside", style: "thin", color: line }, wrapText: true };
section(terms, "A26:F26", "四、建议合同验收交付物");
terms.getRange("A27:F32").values = [
  ["阶段","主要交付物","功能验收","质量证据","甲方配合","结论"],
  ["一期","核心平台、文件导入、三类模板、统计图表报告、审核、ZIP、接口文档","合成数据全流程","自动化测试、扫描、双视口、制品哈希","确认需求和验收样例","演示/测试环境可用"],
  ["二期","医院接口、授权、真实项目、监控、备份恢复、培训","5-10 个真实项目流程","数据对账、安全、性能、容灾","接口、数据、专家和伦理授权","受限试点可用"],
  ["三期","选配算法、样式、双语、多机构和扩展接口","按选配清单验收","专项测试与回归","确认目标期刊和扩展范围","商业增强能力"],
  ["终验","部署包、源码/交付物（依合同）、文档、账号、培训、问题清单","P0 需求闭环","无未接受高危问题","联合签署验收","达到合同约定上线门槛"],
  ["持续服务","运维、升级、模板维护、模型评测和专项科研服务","按年度 SLA","月报/季报和问题闭环","续费与服务范围确认","另签年度服务"],
];
header(terms.getRange("A27:F27"));
terms.getRange("A28:F32").format = { borders: { preset: "all", style: "thin", color: line }, wrapText: true, verticalAlignment: "center" };
terms.getRange("A:A").format.columnWidth = 14; terms.getRange("B:B").format.columnWidth = 30; terms.getRange("C:F").format.columnWidth = 30;
terms.getRange("A4:A17").format.columnWidth = 10; terms.getRange("B4:B17").format.columnWidth = 22; terms.getRange("C4:C17").format.columnWidth = 80;

// 通用格式与导出
for (const sheet of [summary, phases, foundations, interfaces, terms]) {
  const used = sheet.getUsedRange();
  used.format.verticalAlignment = "center";
}

await fs.mkdir(outputDir, { recursive: true });
const exported = await SpreadsheetFile.exportXlsx(wb);
await exported.save(outputPath);

const inspect = await wb.inspect({
  kind: "sheet,table,formula",
  include: "id,name,values,formulas",
  tableMaxRows: 12,
  tableMaxCols: 14,
  maxChars: 16000,
});
await fs.writeFile(`${outputDir}/final-inspect.ndjson`, inspect.ndjson, "utf8");

const errorScan = await wb.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
await fs.writeFile(`${outputDir}/formula-errors.ndjson`, errorScan.ndjson, "utf8");

for (const [index, sheetName] of ["商务报价总览","功能模块选择清单","分期范围汇总","公共基础能力","数据接口与实施","报价边界与条款","报价参数"].entries()) {
  const preview = await wb.render({ sheetName, autoCrop: "all", scale: index === 1 ? 0.8 : 1.1, format: "png" });
  await fs.writeFile(`${outputDir}/preview-${String(index + 1).padStart(2,"0")}.png`, new Uint8Array(await preview.arrayBuffer()));
}

console.log(JSON.stringify({ outputPath, requirementCount: requirements.length, dataStart, dataEnd, errorScan: errorScan.ndjson }, null, 2));
