import React, { useEffect, useMemo, useState } from "react";
import { Modal, Form, Input, Typography, message } from "antd";
import NewsApi from "../../../vn.fpt.edu.api/News";

export default function EditNewsModal({ visible, news, onCancel, onSuccess }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const displayUrl = useMemo(() => {
    if (!imageUrl) return "";
    if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
    if (imageUrl.startsWith("/")) return `${window.location.origin}${imageUrl}`;
    return imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (visible && news) {
      form.setFieldsValue({
        title: news.title || news.__raw?.Title || "",
        content: news.content || news.__raw?.Content || "",
        newsImage: news.newsImage || news.__raw?.NewsImage || "",
      });
      setImageUrl(news.newsImage || news.__raw?.NewsImage || "");
    }
  }, [visible, news, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      const payload = {
        title: values.title.trim(),
        content: values.content?.trim() || null,
        newsImage: values.newsImage?.trim() || null,
      };

      await NewsApi.updateNews(news.id || news.newsId, payload);
      message.success("News updated successfully");
      form.resetFields();
      onSuccess();
    } catch (e) {
      console.error("Error updating news:", e);
      message.error(`Failed to update news: ${e.response?.data?.message ?? e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  if (!news) return null;

  return (
    <Modal
      title={<Typography.Title level={4} style={{ margin: 0 }}>Edit News</Typography.Title>}
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText="Update"
      cancelText="Cancel"
      confirmLoading={loading}
      width={820}
      styles={{ body: { paddingTop: 16 } }}
    >
      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item
          label="Title"
          name="title"
          rules={[
            { required: true, message: "Please enter news title" },
            { max: 255, message: "Title must not exceed 255 characters" }
          ]}
        >
          <Input placeholder="Enter news title" size="large" />
        </Form.Item>
        <Form.Item label="Content" name="content">
          <Input.TextArea
            rows={10}
            placeholder="Write the announcement... supports up to 5000 characters"
            showCount
            maxLength={5000}
          />
        </Form.Item>

        <div style={{ background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 8, padding: 12 }}>
          <Form.Item
            label="News Image URL"
            name="newsImage"
            rules={[{ max: 512, message: "Image URL must not exceed 512 characters" }]}
            style={{ marginBottom: 8 }}
          >
            <Input
              placeholder="Paste image URL (jpg, png, webp...)"
              onChange={(e) => setImageUrl(e.target.value)}
              allowClear
            />
          </Form.Item>
          <div style={{
            height: 220,
            border: "1px dashed #d9d9d9",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fff"
          }}>
            {displayUrl ? (
              <img
                src={displayUrl}
                alt="Preview"
                style={{ maxWidth: "100%", maxHeight: 210, objectFit: "contain" }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div style={{ color: "#999" }}>Paste an image URL to preview</div>
            )}
          </div>
        </div>
      </Form>
    </Modal>
  );
}

