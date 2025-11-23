import React, { useEffect, useMemo, useState } from "react";
import { Modal, Form, Input, Typography, notification, message, Upload, Radio, Space, Button } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import NewsApi from "../../../vn.fpt.edu.api/News";

export default function EditNewsModal({ visible, news, onCancel, onSuccess }) {
  const [api, contextHolder] = notification.useNotification();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageSource, setImageSource] = useState("url"); // "url" or "upload"
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  
  const displayUrl = useMemo(() => {
    if (!imageUrl) return "";
    if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
    if (imageUrl.startsWith("/")) return `${window.location.origin}${imageUrl}`;
    if (imageUrl.startsWith("data:image/")) return imageUrl; // Base64 data URL
    return imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (visible && news) {
      const existingImageUrl = news.newsImage || news.__raw?.NewsImage || "";
      form.setFieldsValue({
        title: news.title || news.__raw?.Title || "",
        content: news.content || news.__raw?.Content || "",
        newsImage: existingImageUrl,
      });
      setImageUrl(existingImageUrl);
      setImagePreview(existingImageUrl);
      // Determine source type based on existing image
      setImageSource(existingImageUrl.startsWith("data:image/") ? "upload" : "url");
    } else if (!visible) {
      // Reset when modal closes
      setImageUrl("");
      setImagePreview(null);
      setImageSource("url");
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

      // Debug: Check image URL length
      if (payload.newsImage) {
        console.log("=== News Image Debug ===");
        console.log("Image URL length:", payload.newsImage.length);
        console.log("Image URL preview (first 100 chars):", payload.newsImage.substring(0, 100));
        console.log("Is data URL:", payload.newsImage.startsWith("data:image/"));
        console.log("========================");
      }

      await NewsApi.updateNews(news.id || news.newsId, payload);
      form.resetFields();
      // Hiển thị toast notification
      api.success({
        message: "Success",
        description: "News updated successfully",
        placement: "topRight",
        duration: 3,
      });
      setTimeout(() => {
        onSuccess();
      }, 500);
    } catch (e) {
      console.error("Error updating news:", e);
      api.error({
        message: "Error",
        description: `Failed to update news: ${e.response?.data?.message ?? e.message}`,
        placement: "topRight",
        duration: 3,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setImageUrl("");
    setImagePreview(null);
    setImageSource("url");
    onCancel();
  };

  const handleImageUpload = async (file) => {
    try {
      setUploading(true);
      const response = await NewsApi.uploadImage(file);
      // Response structure: { imageUrl: string } or { data: { imageUrl: string } }
      const uploadedUrl = response?.imageUrl || response?.data?.imageUrl;
      
      if (uploadedUrl) {
        // Debug: Check uploaded image URL length
        console.log("=== Uploaded Image Debug ===");
        console.log("Image URL length:", uploadedUrl.length);
        console.log("Image URL preview (first 100 chars):", uploadedUrl.substring(0, 100));
        console.log("Is data URL:", uploadedUrl.startsWith("data:image/"));
        console.log("===========================");
        
        form.setFieldsValue({ newsImage: uploadedUrl });
        setImageUrl(uploadedUrl);
        setImagePreview(uploadedUrl);
        message.success("Image uploaded successfully!");
      } else {
        message.error("Failed to receive image URL from server");
      }
      return false; // Prevent default upload behavior
    } catch (error) {
      console.error("Error uploading image:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to upload image";
      message.error(errorMessage);
      return false;
    } finally {
      setUploading(false);
    }
  };

  if (!news) return null;

  return (
    <>
      {contextHolder}
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
            label="News Image"
            style={{ marginBottom: 12 }}
          >
            <Radio.Group
              value={imageSource}
              onChange={(e) => {
                const newSource = e.target.value;
                setImageSource(newSource);
                // Don't reset form value when switching - preserve uploaded image
                if (newSource === "url") {
                  const currentValue = form.getFieldValue("newsImage");
                  if (!currentValue && imageUrl) {
                    form.setFieldsValue({ newsImage: imageUrl });
                  }
                }
              }}
            >
              <Space>
                <Radio value="url">Image URL</Radio>
                <Radio value="upload">Upload from Device</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          {/* Hidden Form.Item to store the image URL */}
          <Form.Item name="newsImage" hidden>
            <Input />
          </Form.Item>

          {imageSource === "url" ? (
            <Form.Item
              rules={[
                {
                  validator: (_, value) => {
                    if (!value || !value.trim()) {
                      return Promise.resolve();
                    }
                    const url = value.trim();
                    const isDataUrl = url.startsWith("data:image/");
                    
                    // For HTTP URLs, check max length (data URLs can be very long)
                    if (!isDataUrl && url.length > 2000) {
                      return Promise.reject(new Error("Image URL must not exceed 2000 characters"));
                    }
                    
                    // Check for shortened URL patterns (only for HTTP URLs)
                    if (!isDataUrl) {
                      const shortenedPatterns = [
                        "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "buff.ly",
                        "short.link", "is.gd", "v.gd", "rebrand.ly", "cutt.ly",
                        "byvn.net", "tiny.cc", "shorturl.at", "rebrandly.com", "short.cm"
                      ];
                      
                      const isShortened = shortenedPatterns.some(pattern => 
                        url.toLowerCase().includes(pattern.toLowerCase())
                      );
                      
                      if (isShortened) {
                        return Promise.reject(new Error("Shortened URLs are not supported. Please use a direct image URL (must end with .jpg, .jpeg, .png, .gif, .webp)."));
                      }
                      
                      // Check if URL is suspiciously short and doesn't have image extension
                      const hasImageExtension = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
                      const isHttpUrl = /^https?:\/\//i.test(url);
                      
                      if (isHttpUrl && url.length < 50 && !hasImageExtension) {
                        return Promise.reject(new Error("This URL appears to be a shortened link. Please use a direct image URL (must end with .jpg, .jpeg, .png, .gif, .webp)."));
                      }
                    }
                    
                    return Promise.resolve();
                  }
                }
              ]}
              style={{ marginBottom: 8 }}
            >
              <Input
                placeholder="Paste direct image URL (must end with .jpg, .jpeg, .png, .gif, .webp)"
                onChange={(e) => {
                  const value = e.target.value;
                  setImageUrl(value);
                  form.setFieldsValue({ newsImage: value });
                  setImagePreview(value);
                }}
                allowClear
              />
            </Form.Item>
          ) : (
            <Form.Item style={{ marginBottom: 8 }}>
              <Upload
                beforeUpload={handleImageUpload}
                showUploadList={false}
                accept="image/*"
                disabled={uploading}
              >
                <Button
                  icon={<UploadOutlined />}
                  loading={uploading}
                  disabled={uploading}
                  block
                  style={{
                    height: "auto",
                    padding: "8px",
                  }}
                >
                  {uploading ? "Uploading..." : "Click to upload image (max 5MB)"}
                </Button>
              </Upload>
            </Form.Item>
          )}

          <div style={{
            height: 220,
            border: "1px dashed #d9d9d9",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fff",
            position: "relative"
          }}>
            {imagePreview || displayUrl ? (
              <>
                <img
                  src={imagePreview || displayUrl}
                  alt="Preview"
                  style={{ maxWidth: "100%", maxHeight: 210, objectFit: "contain" }}
                  referrerPolicy="no-referrer"
                  onError={() => {
                    message.error("Failed to load image preview");
                  }}
                />
                {imageSource === "upload" && imagePreview && (
                  <Button
                    type="text"
                    danger
                    size="small"
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                    }}
                    onClick={() => {
                      setImagePreview(null);
                      setImageUrl("");
                      form.setFieldsValue({ newsImage: "" });
                    }}
                  >
                    Remove
                  </Button>
                )}
              </>
            ) : (
              <div style={{ color: "#999" }}>
                {imageSource === "url" ? "Paste an image URL to preview" : "Upload an image to preview"}
              </div>
            )}
          </div>
        </div>
      </Form>
    </Modal>
    </>
  );
}

