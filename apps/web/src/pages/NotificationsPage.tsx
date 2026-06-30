import { FormEvent, useEffect, useMemo, useState } from "react";
import { BellRing, Mail, Plus, Send, Webhook } from "lucide-react";
import {
  createNotificationChannel,
  createNotificationRule,
  listNotificationChannels,
  listNotificationRules,
  NotificationChannel,
  NotificationRule,
  testNotificationChannel,
  updateNotificationChannel,
  updateNotificationRule
} from "../api/client";
import { Modal } from "../components/Modal";

function formatDateTime(value?: string | null) {
  return value ? value.slice(0, 16).replace("T", " ") : "-";
}

function statusClass(status: string) {
  return status === "ACTIVE" ? "status-pill success" : "status-pill muted";
}

function statusLabel(status: string) {
  return status === "ACTIVE" ? "启用" : "停用";
}

function channelTypeLabel(type: string) {
  return type === "WEBHOOK" ? "Webhook" : "邮件";
}

function eventTypeLabel(type: string) {
  return {
    USAGE_WARNING: "额度预警",
    RATE_LIMITED: "限流触发",
    BILLING_FAILED: "账单失败",
    JOB_FAILED: "任务失败",
    HIGH_PRIORITY_EXCEPTION: "高优先级异常"
  }[type] ?? type;
}

type ModalState = { kind: "channel"; channel?: NotificationChannel } | { kind: "rule"; rule?: NotificationRule };

export function NotificationsPage() {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    const [nextChannels, nextRules] = await Promise.all([listNotificationChannels(), listNotificationRules()]);
    setChannels(nextChannels);
    setRules(nextRules);
  }

  useEffect(() => {
    loadData().catch(() => setMessage("通知配置数据加载失败"));
  }, []);

  const metrics = useMemo(
    () => ({
      channels: channels.length,
      activeRules: rules.filter((rule) => rule.status === "ACTIVE").length,
      webhook: channels.filter((channel) => channel.type === "WEBHOOK").length,
      email: channels.filter((channel) => channel.type === "EMAIL").length
    }),
    [channels, rules]
  );

  async function handleChannelSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      name: String(form.get("name")),
      type: String(form.get("type")) as NotificationChannel["type"],
      target: String(form.get("target")),
      status: String(form.get("status")) as NotificationChannel["status"]
    };

    if (modal?.kind === "channel" && modal.channel) {
      await updateNotificationChannel(modal.channel.id, input);
      setMessage("通知通道已更新");
    } else {
      await createNotificationChannel(input);
      setMessage("通知通道已创建");
    }

    setModal(null);
    await loadData();
  }

  async function handleRuleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const threshold = String(form.get("threshold"));
    const severity = String(form.get("severity"));
    const input = {
      name: String(form.get("name")),
      eventType: String(form.get("eventType")) as NotificationRule["eventType"],
      severity: severity ? (severity as NotificationRule["severity"]) : null,
      channelId: String(form.get("channelId")),
      threshold: threshold ? Number(threshold) : null,
      status: String(form.get("status")) as NotificationRule["status"]
    };

    if (modal?.kind === "rule" && modal.rule) {
      await updateNotificationRule(modal.rule.id, input);
      setMessage("通知规则已更新");
    } else {
      await createNotificationRule(input);
      setMessage("通知规则已创建");
    }

    setModal(null);
    await loadData();
  }

  async function handleTestChannel(channel: NotificationChannel) {
    await testNotificationChannel(channel.id);
    setMessage(`已模拟测试 ${channel.name}`);
    await loadData();
  }

  return (
    <section className="page-section">
      <div className="page-heading">
        <p className="eyebrow">运营配置</p>
        <h1>通知配置</h1>
      </div>
      {message ? <div className="empty-state">{message}</div> : null}
      <div className="metric-grid">
        <article className="metric-card accent-blue"><span><BellRing size={18} aria-hidden="true" />通知通道</span><strong>{metrics.channels}</strong></article>
        <article className="metric-card accent-teal"><span><Send size={18} aria-hidden="true" />启用规则</span><strong>{metrics.activeRules}</strong></article>
        <article className="metric-card accent-indigo"><span><Webhook size={18} aria-hidden="true" />Webhook</span><strong>{metrics.webhook}</strong></article>
        <article className="metric-card accent-amber"><span><Mail size={18} aria-hidden="true" />邮件</span><strong>{metrics.email}</strong></article>
      </div>
      <div className="table-panel">
        <div className="table-header">
          <div>
            <h2>通知通道</h2>
            <p>首版只保存配置，测试按钮返回模拟成功。</p>
          </div>
          <button type="button" onClick={() => setModal({ kind: "channel" })}><Plus size={16} aria-hidden="true" />新增通道</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>名称</th>
              <th>类型</th>
              <th>目标</th>
              <th>状态</th>
              <th>最近测试</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((channel) => (
              <tr key={channel.id}>
                <td>{channel.name}</td>
                <td>{channelTypeLabel(channel.type)}</td>
                <td><code>{channel.target}</code></td>
                <td><span className={statusClass(channel.status)}>{statusLabel(channel.status)}</span></td>
                <td>{formatDateTime(channel.lastTestedAt)}</td>
                <td>
                  <button type="button" className="secondary-button" onClick={() => setModal({ kind: "channel", channel })}>编辑</button>
                  <button type="button" className="secondary-button" onClick={() => handleTestChannel(channel)}>测试</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-panel">
        <div className="table-header">
          <div>
            <h2>通知规则</h2>
            <p>触发条件保存到数据库，真实投递后续实现。</p>
          </div>
          <button type="button" onClick={() => setModal({ kind: "rule" })}><Plus size={16} aria-hidden="true" />新增规则</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>名称</th>
              <th>触发条件</th>
              <th>级别</th>
              <th>阈值</th>
              <th>通道</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td>{rule.name}</td>
                <td>{eventTypeLabel(rule.eventType)}</td>
                <td>{rule.severity ?? "-"}</td>
                <td>{rule.threshold ? `${rule.threshold}%` : "-"}</td>
                <td>{rule.channel?.name ?? "-"}</td>
                <td><span className={statusClass(rule.status)}>{statusLabel(rule.status)}</span></td>
                <td><button type="button" className="secondary-button" onClick={() => setModal({ kind: "rule", rule })}>编辑</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal?.kind === "channel" ? (
        <Modal title={modal.channel ? "编辑通知通道" : "新增通知通道"} onClose={() => setModal(null)}>
          <form className="modal-form" onSubmit={handleChannelSubmit}>
            <label>名称<input name="name" defaultValue={modal.channel?.name ?? ""} required /></label>
            <label>
              类型
              <select name="type" defaultValue={modal.channel?.type ?? "WEBHOOK"}>
                <option value="WEBHOOK">Webhook</option>
                <option value="EMAIL">邮件</option>
              </select>
            </label>
            <label>目标地址<input name="target" defaultValue={modal.channel?.target ?? ""} required /></label>
            <label>
              状态
              <select name="status" defaultValue={modal.channel?.status ?? "ACTIVE"}>
                <option value="ACTIVE">启用</option>
                <option value="DISABLED">停用</option>
              </select>
            </label>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setModal(null)}>取消</button>
              <button type="submit">保存</button>
            </div>
          </form>
        </Modal>
      ) : null}
      {modal?.kind === "rule" ? (
        <Modal title={modal.rule ? "编辑通知规则" : "新增通知规则"} onClose={() => setModal(null)}>
          <form className="modal-form" onSubmit={handleRuleSubmit}>
            <label>名称<input name="name" defaultValue={modal.rule?.name ?? ""} required /></label>
            <label>
              触发条件
              <select name="eventType" defaultValue={modal.rule?.eventType ?? "USAGE_WARNING"}>
                <option value="USAGE_WARNING">额度预警</option>
                <option value="RATE_LIMITED">限流触发</option>
                <option value="BILLING_FAILED">账单失败</option>
                <option value="JOB_FAILED">任务失败</option>
                <option value="HIGH_PRIORITY_EXCEPTION">高优先级异常</option>
              </select>
            </label>
            <label>
              级别
              <select name="severity" defaultValue={modal.rule?.severity ?? ""}>
                <option value="">不限制</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </label>
            <label>阈值<input name="threshold" type="number" min="1" max="100" defaultValue={modal.rule?.threshold ?? ""} /></label>
            <label>
              通道
              <select name="channelId" defaultValue={modal.rule?.channelId ?? channels[0]?.id} required>
                {channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}
              </select>
            </label>
            <label>
              状态
              <select name="status" defaultValue={modal.rule?.status ?? "ACTIVE"}>
                <option value="ACTIVE">启用</option>
                <option value="DISABLED">停用</option>
              </select>
            </label>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setModal(null)}>取消</button>
              <button type="submit">保存</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
