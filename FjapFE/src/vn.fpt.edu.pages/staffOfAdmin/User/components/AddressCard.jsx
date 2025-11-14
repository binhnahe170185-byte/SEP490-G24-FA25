import React from "react";
import { Card, Form, Input } from "antd";

const { TextArea } = Input;

const title = <span style={{ fontWeight: 600, fontSize: 16, color: "#333" }}>Address</span>;
const label = <span style={{ fontWeight: 600, color: "#1f1f1f" }}>Address</span>;

function AddressCard() {
  return (
    <Card
      title={title}
      bordered={false}
      bodyStyle={{ padding: 16 }}
      style={{ marginBottom: 16 }}
    >
      <Form.Item  name="address" style={{ marginBottom: 0 }}>
        <TextArea
          placeholder="Street, district, city"
          rows={3}
          autoSize={{ minRows: 3, maxRows: 4 }}
        />
      </Form.Item>
    </Card>
  );
}

export default AddressCard;

