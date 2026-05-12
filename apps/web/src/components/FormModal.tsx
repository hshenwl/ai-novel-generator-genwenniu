import React from 'react';
import { Modal, Form } from 'antd';

interface Props {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => Promise<void>;
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  width?: number;
}

const FormModal: React.FC<Props> = ({ open, onCancel, onSubmit, title, children, loading, width }) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
      form.resetFields();
    } catch { /* validation failed */ }
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={() => { form.resetFields(); onCancel(); }}
      onOk={handleOk}
      confirmLoading={loading}
      width={width || 520}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        {children}
      </Form>
    </Modal>
  );
};

export default FormModal;
