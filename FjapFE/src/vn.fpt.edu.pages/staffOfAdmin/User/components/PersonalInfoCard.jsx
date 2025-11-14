import React from "react";
import { Card, Form, Row, Col, Input, Select, DatePicker } from "antd";

const { Option } = Select;

const fieldStyle = { marginBottom: 12 };

const sectionTitle = <span style={{ fontWeight: 600, fontSize: 16, color: "#333" }}>Personal Information</span>;
const labelStyle = { fontWeight: 600, color: "#1f1f1f" };
const renderLabel = (text) => <span style={labelStyle}>{text}</span>;

function PersonalInfoCard({
  staffTypeOptions,
  genderOptions,
  departments,
  loadingDepartments,
  staffType,
  onStaffTypeChange,
  onDepartmentChange,
  nameRegex,
  phoneRule,
  disabledDob,
}) {
  return (
    <Card
      title={sectionTitle}
      bordered={false}
      bodyStyle={{ padding: 16 }}
      style={{ marginBottom: 16 }}
    >
      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <Form.Item
            label={renderLabel("Staff Type")}
            name="staffType"
            rules={[{ required: true, message: "Select staff type" }]}
            style={fieldStyle}
          >
            <Select size="large" placeholder="Select type" onChange={onStaffTypeChange}>
              {staffTypeOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            label={renderLabel("Department")}
            name="departmentId"
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const type = getFieldValue("staffType");
                  if (type === "staff" && !value) {
                    return Promise.reject(new Error("Select department"));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
            style={fieldStyle}
          >
            <Select
              size="large"
              placeholder={staffType === "staff" ? "Select department" : "Select staff type first"}
              loading={loadingDepartments}
              onChange={onDepartmentChange}
              allowClear
              disabled={staffType !== "staff"}
              showSearch
              optionFilterProp="children"
            >
              {departments.map((dept) => (
                <Option key={dept.departmentId || dept.id} value={dept.departmentId || dept.id}>
                  {dept.name || dept.departmentName}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <Form.Item
            label={renderLabel("Last Name")}
            name="lastName"
            rules={[
              { required: true, message: "Enter last name" },
              { min: 2, message: "Min 2 characters" },
              { pattern: nameRegex, message: "Only letters allowed" },
            ]}
            style={fieldStyle}
          >
            <Input size="large" placeholder="Nguyen" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            label={renderLabel("First Name")}
            name="firstName"
            rules={[
              { required: true, message: "Enter first name" },
              { min: 2, message: "Min 2 characters" },
              { pattern: nameRegex, message: "Only letters allowed" },
            ]}
            style={fieldStyle}
          >
            <Input size="large" placeholder="An" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <Form.Item
            label={renderLabel("Email")}
            name="email"
            rules={[
              { required: true, message: "Enter email" },
              { type: "email", message: "Invalid email" },
            ]}
            style={fieldStyle}
          >
            <Input size="large" placeholder="user@fpt.edu.vn" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item label={renderLabel("Phone Number")} name="phoneNumber" rules={[phoneRule]} style={fieldStyle}>
            <Input size="large" placeholder="0xxxxxxxxx" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <Form.Item
            label={renderLabel("Gender")}
            name="gender"
            rules={[{ required: true, message: "Select gender" }]}
            style={fieldStyle}
          >
            <Select size="large" placeholder="Select">
              {genderOptions.map((gender) => (
                <Option key={gender.value} value={gender.value}>
                  {gender.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            label={renderLabel("Date of Birth")}
            name="dob"
            rules={[{ required: true, message: "Select date" }]}
            style={fieldStyle}
          >
            <DatePicker
              size="large"
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              placeholder="DD/MM/YYYY"
              superPrevIcon={null}
              superNextIcon={null}
              disabledDate={disabledDob}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="roleId" hidden>
        <Input type="hidden" />
      </Form.Item>
    </Card>
  );
}

export default PersonalInfoCard;

