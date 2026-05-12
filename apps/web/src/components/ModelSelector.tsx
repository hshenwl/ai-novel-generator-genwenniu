import { useEffect, useState } from 'react';
import { Select, Space, Tag, Tooltip } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import api from '../services/api';

interface ModelInfo {
  name: string;
  modelId: string;
  provider: string;
  baseUrl?: string;
}

interface Props {
  value?: string;
  onChange?: (model: string) => void;
  style?: React.CSSProperties;
  size?: 'small' | 'middle' | 'large';
}

/**
 * 模型选择器 — 在所有 AI 生成页面统一使用
 * 从 /api/engine/models 获取已注册模型列表
 */
export default function ModelSelector({ value, onChange, style, size = 'middle' }: Props) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [defaultModel, setDefaultModel] = useState('');

  useEffect(() => {
    api.get('/engine/models').then((res: any) => {
      const configs = res?.configs || {};
      const list: ModelInfo[] = Object.entries(configs).map(([name, cfg]: [string, any]) => ({
        name,
        modelId: cfg.modelId || name,
        provider: cfg.provider || 'unknown',
        baseUrl: cfg.baseUrl,
      }));
      setModels(list);
      setDefaultModel(res?.default || '');
    }).catch(() => {});
  }, []);

  const currentValue = value || defaultModel;

  return (
    <Select
      value={currentValue}
      onChange={onChange}
      style={{ minWidth: 200, ...style }}
      size={size}
      placeholder="选择模型"
      optionLabelProp="label"
    >
      {models.map(m => (
        <Select.Option key={m.name} value={m.name} label={m.name}>
          <Space>
            <ThunderboltOutlined style={{ color: m.name === defaultModel ? '#1890ff' : undefined }} />
            <span>{m.name}</span>
            <Tag color={m.provider === 'ollama' ? 'green' : 'blue'} style={{ fontSize: 11 }}>{m.modelId}</Tag>
          </Space>
        </Select.Option>
      ))}
    </Select>
  );
}
