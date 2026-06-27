import { useState } from "react";
import { BookOpenText, Check, ChevronDown, Clipboard } from "lucide-react";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7612";
const endpoint = `${apiBaseUrl}/api/v1/messages`;

const snippets = [
  {
    language: "cURL",
    code: `curl -X POST "${endpoint}" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "X-Request-Id: req_$(date +%s)" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"hello"}'`
  },
  {
    language: "JavaScript",
    code: `const response = await fetch("${endpoint}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer <API_KEY>",
    "X-Request-Id": crypto.randomUUID(),
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ message: "hello" })
});

if (!response.ok) {
  throw new Error(\`Request failed: \${response.status}\`);
}

const data = await response.json();`
  },
  {
    language: "Python",
    code: `import uuid
import requests

response = requests.post(
    "${endpoint}",
    headers={
        "Authorization": "Bearer <API_KEY>",
        "X-Request-Id": str(uuid.uuid4()),
        "Content-Type": "application/json",
    },
    json={"message": "hello"},
    timeout=10,
)
response.raise_for_status()
data = response.json()`
  },
  {
    language: "Go",
    code: `package main

import (
  "bytes"
  "fmt"
  "io"
  "net/http"
)

func main() {
  body := bytes.NewBufferString(\`{"message":"hello"}\`)
  req, err := http.NewRequest("POST", "${endpoint}", body)
  if err != nil {
    panic(err)
  }

  req.Header.Set("Authorization", "Bearer <API_KEY>")
  req.Header.Set("X-Request-Id", "req-unique-id")
  req.Header.Set("Content-Type", "application/json")

  resp, err := http.DefaultClient.Do(req)
  if err != nil {
    panic(err)
  }
  defer resp.Body.Close()

  responseBody, _ := io.ReadAll(resp.Body)
  fmt.Println(resp.StatusCode, string(responseBody))
}`
  },
  {
    language: "Java",
    code: `HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("${endpoint}"))
    .header("Authorization", "Bearer <API_KEY>")
    .header("X-Request-Id", UUID.randomUUID().toString())
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString("{\\"message\\":\\"hello\\"}"))
    .build();

HttpResponse<String> response = client.send(
    request,
    HttpResponse.BodyHandlers.ofString()
);

if (response.statusCode() >= 400) {
    throw new RuntimeException(response.body());
}`
  }
];

export function IntegrationPage() {
  const [openLanguage, setOpenLanguage] = useState<string | null>(null);
  const [copiedLanguage, setCopiedLanguage] = useState<string | null>(null);

  async function copyCode(language: string, code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedLanguage(language);
    window.setTimeout(() => setCopiedLanguage((current) => (current === language ? null : current)), 1600);
  }

  return (
    <section className="page-section">
      <section className="summary-panel integration-summary">
        <div className="panel-title">
          <div>
            <h2 className="heading-with-icon">
              <BookOpenText size={20} aria-hidden="true" />
              API 接入
            </h2>
            <p>当前可计量接口为消息处理接口。调用时必须携带 API Key 和唯一请求 ID。</p>
          </div>
        </div>
        <dl className="integration-meta">
          <div><dt>请求方法</dt><dd>POST</dd></div>
          <div><dt>接口地址</dt><dd><code>{endpoint}</code></dd></div>
          <div><dt>认证 Header</dt><dd><code>Authorization: Bearer &lt;API_KEY&gt;</code></dd></div>
          <div><dt>幂等 Header</dt><dd><code>X-Request-Id: &lt;unique request id&gt;</code></dd></div>
        </dl>
      </section>

      <section className="integration-list" aria-label="各语言接入示例">
        {snippets.map((snippet) => (
          <article className="code-card code-accordion" key={snippet.language}>
            <button
              type="button"
              className="code-accordion-trigger"
              aria-expanded={openLanguage === snippet.language}
              onClick={() => setOpenLanguage((current) => (current === snippet.language ? null : snippet.language))}
            >
              <span>{snippet.language}</span>
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            {openLanguage === snippet.language ? (
              <div className="code-accordion-body">
                <div className="code-actions">
                  <button type="button" className="secondary-button" onClick={() => copyCode(snippet.language, snippet.code)}>
                    {copiedLanguage === snippet.language ? <Check size={16} aria-hidden="true" /> : <Clipboard size={16} aria-hidden="true" />}
                    {copiedLanguage === snippet.language ? "已复制" : `复制 ${snippet.language} 代码`}
                  </button>
                </div>
                <pre><code>{snippet.code}</code></pre>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </section>
  );
}
