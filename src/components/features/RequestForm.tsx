'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FileUpload } from './FileUpload';
import type { ApiRequest, HttpMethod, RequestHeader, RequestFile } from '@/types';

const METHOD_OPTIONS: { label: string; value: HttpMethod }[] = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'DELETE', value: 'DELETE' },
];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-green-600',
  POST: 'text-blue-600',
  PUT: 'text-yellow-600',
  PATCH: 'text-orange-600',
  DELETE: 'text-red-600',
};

interface TestExample {
  label: string;
  url: string;
  method: HttpMethod;
  headers: RequestHeader[];
  body: string;
}

const TEST_EXAMPLES: TestExample[] = [
  {
    label: 'BrasilAPI — Bancos',
    url: 'https://brasilapi.com.br/api/banks/v1',
    method: 'GET',
    headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
    body: '',
  },
];

interface RequestFormProps {
  onSubmit: (req: ApiRequest) => void;
  loading: boolean;
}

export default function RequestForm({ onSubmit, loading }: RequestFormProps) {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [headers, setHeaders] = useState<RequestHeader[]>([
    { key: 'Accept', value: 'application/json', enabled: true },
  ]);
  const [body, setBody] = useState('');
  const [bypassSsl, setBypassSsl] = useState(false);
  const [certificate, setCertificate] = useState('');
  const [credentialsSecretName, setCredentialsSecretName] = useState('');
  const [contentType, setContentType] = useState<'json' | 'raw' | 'form-data' | 'x-www-form-urlencoded'>('json');
  const [files, setFiles] = useState<RequestFile[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'headers' | 'body' | 'files' | 'form' | 'ssl' | 'auth'>('headers');

  function applyExample(example: TestExample) {
    setUrl(example.url);
    setMethod(example.method);
    setHeaders(example.headers);
    setBody(example.body);
    setBypassSsl(false);
    setCertificate('');
    setCredentialsSecretName('');
    setContentType('json');
    setFiles([]);
    setFormData({});
    setActiveTab('headers');
  }

  function addHeader() {
    setHeaders((h) => [...h, { key: '', value: '', enabled: true }]);
  }

  function updateHeader(index: number, field: keyof RequestHeader, value: string | boolean) {
    setHeaders((h) =>
      h.map((hdr, i) => (i === index ? { ...hdr, [field]: value } : hdr)),
    );
  }

  function removeHeader(index: number) {
    setHeaders((h) => h.filter((_, i) => i !== index));
  }

  function addFormField() {
    const key = `field_${Object.keys(formData).length + 1}`;
    setFormData(prev => ({ ...prev, [key]: '' }));
  }

  function updateFormField(key: string, value: string) {
    setFormData(prev => ({ ...prev, [key]: value }));
  }

  function removeFormField(key: string) {
    setFormData(prev => {
      const newFormData = { ...prev };
      delete newFormData[key];
      return newFormData;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      url,
      method,
      headers,
      body,
      bypassSsl,
      certificate: certificate || undefined,
      credentialsSecretName: credentialsSecretName || undefined,
      contentType,
      files: files.length > 0 ? files : undefined,
      formData: Object.keys(formData).length > 0 ? formData : undefined,
    });
  }

  const tabs = [
    { id: 'headers', label: `Headers (${headers.filter((h) => h.enabled).length})` },
    { id: 'body', label: 'Body', visible: () => contentType === 'json' || contentType === 'raw' },
    { id: 'files', label: `Files (${files.length})`, visible: () => contentType === 'form-data' },
    { id: 'form', label: 'Form Data', visible: () => contentType === 'form-data' || contentType === 'x-www-form-urlencoded' },
    { id: 'ssl', label: 'SSL' },
    { id: 'auth', label: 'Auth' },
  ].filter(tab => !tab.visible || tab.visible()) as Array<{ id: string; label: string }>;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Exemplos de teste */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">Exemplos:</span>
        {TEST_EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => applyExample(ex)}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-dashed border-gray-300 text-gray-500 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          >
            <BeakerIcon />
            {ex.label}
          </button>
        ))}
      </div>

      {/* URL bar */}
      <div className="flex gap-2">
        <div className="w-32 shrink-0">
          <Select
            value={method}
            onChange={(e) => setMethod(e.target.value as HttpMethod)}
            options={METHOD_OPTIONS}
            className={`font-bold ${METHOD_COLORS[method]}`}
          />
        </div>
        <div className="flex-1">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/endpoint"
            required
            type="url"
          />
        </div>
        <Button type="submit" disabled={loading} size="md">
          {loading ? (
            <span className="flex items-center gap-2">
              <Spinner /> Sending…
            </span>
          ) : (
            'Send'
          )}
        </Button>
      </div>

      {/* Content Type Selector */}
      <div className="flex items-center gap-4">
        <span className="text-xs font-medium text-gray-400">Content-Type:</span>
        <div className="flex items-center gap-2">
          {[
            { value: 'json', label: 'JSON' },
            { value: 'raw', label: 'Raw' },
            { value: 'form-data', label: 'Form Data' },
            { value: 'x-www-form-urlencoded', label: 'URL Encoded' },
          ].map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setContentType(type.value as any)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                contentType === type.value
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200 bg-gray-50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white border-b-2 border-brand-600 text-brand-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* ── Headers ── */}
          {activeTab === 'headers' && (
            <div className="flex flex-col gap-2">
              {headers.map((hdr, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hdr.enabled}
                    onChange={(e) => updateHeader(i, 'enabled', e.target.checked)}
                    className="accent-brand-600"
                  />
                  <Input
                    value={hdr.key}
                    onChange={(e) => updateHeader(i, 'key', e.target.value)}
                    placeholder="Header name"
                    className="flex-1"
                  />
                  <Input
                    value={hdr.value}
                    onChange={(e) => updateHeader(i, 'value', e.target.value)}
                    placeholder="Value"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeHeader(i)}
                  >
                    ✕
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={addHeader}>
                + Add Header
              </Button>
            </div>
          )}

          {/* ── Body ── */}
          {activeTab === 'body' && (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder='{"key": "value"}'
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-mono placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-y"
            />
          )}

          {/* ── Files ── */}
          {activeTab === 'files' && (
            <FileUpload
              files={files}
              onFilesChange={setFiles}
              maxFiles={10}
              maxSize={10 * 1024 * 1024} // 10MB
            />
          )}

          {/* ── Form Data ── */}
          {activeTab === 'form' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">Form Fields</h4>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addFormField}
                >
                  + Add Field
                </Button>
              </div>
              
              {Object.entries(formData).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No form fields added. Click "Add Field" to start.
                </p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(formData).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Input
                        value={key}
                        onChange={(e) => {
                          const newKey = e.target.value;
                          setFormData(prev => {
                            const newFormData = { ...prev };
                            delete newFormData[key];
                            newFormData[newKey] = value;
                            return newFormData;
                          });
                        }}
                        placeholder="Field name"
                        className="flex-1"
                      />
                      <Input
                        value={value}
                        onChange={(e) => updateFormField(key, e.target.value)}
                        placeholder="Field value"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFormField(key)}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {contentType === 'form-data' && files.length === 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700">
                    💡 Para enviar arquivos, adicione-os na aba "Files". Os arquivos serão incluídos automaticamente no formulário multipart.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── SSL ── */}
          {activeTab === 'ssl' && (
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bypassSsl}
                  onChange={(e) => setBypassSsl(e.target.checked)}
                  className="accent-brand-600 w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">
                  Bypass SSL verification (not recommended for production)
                </span>
              </label>

              {!bypassSsl && (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">
                    Custom CA Certificate (PEM)
                  </label>
                  <textarea
                    value={certificate}
                    onChange={(e) => setCertificate(e.target.value)}
                    rows={6}
                    placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-mono placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-y"
                  />
                  <p className="text-xs text-gray-400">
                    Certificate is loaded in memory only and never persisted.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Auth ── */}
          {activeTab === 'auth' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-gray-600">
                The backend automatically obtains a Bearer token via OAuth2
                client-credentials flow using secrets stored in AWS Secrets
                Manager. You may override which secret to use below.
              </p>
              <Input
                label="Credentials Secret Name (optional)"
                value={credentialsSecretName}
                onChange={(e) => setCredentialsSecretName(e.target.value)}
                placeholder="api-consumer/my-api-credentials"
              />
            </div>
          )}
        </div>
      </div>
    </form>
  );
}

function BeakerIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 3v11.382l-3.618 5.427A2 2 0 007.062 23h9.876a2 2 0 001.68-3.191L15 14.382V3h1a1 1 0 000-2H8a1 1 0 000 2h1zm2 0h2v12h-2V3z"/>
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
