import React from 'react';
import { Upload, Button, Space, Row, Col, Form, Select } from 'antd';
import { UploadOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';

const { Option } = Select;

export default function UploadSection({
	form,
	selectedSemesterId,
	selectedSemesterName,
	semesters,
	loadingLookups,
	onUpload,
	onDownloadTemplate,
	onClear,
}) {
	return (
		<Form layout="vertical" form={form}>
			<Row gutter={16}>
				<Col xs={24} sm={12} md={8}>
					<Form.Item
						label="Semester"
						name="semesterId"
						rules={[{ required: true, message: 'Please choose Semester' }]}
					>
						<Select
							placeholder="Chọn semester"
							loading={loadingLookups}
							showSearch
							optionFilterProp="children"
						>
							{semesters.map((s) => (
								<Option
									key={String(s.semesterId || s.id)}
									value={Number(s.semesterId || s.id)}
								>
									{s.name}
								</Option>
							))}
						</Select>
					</Form.Item>
				</Col>
				<Col xs={24} sm={12} md={16} style={{ display: 'flex', alignItems: 'flex-end' }}>
					<Space wrap>
						<Upload.Dragger
							name="file"
							accept=".xlsx,.xls"
							beforeUpload={onUpload}
							showUploadList={false}
							disabled={!selectedSemesterId}
							style={{ minWidth: 320 }}
						>
							<p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
								<UploadOutlined style={{ fontSize: 32, color: '#1890ff' }} />
							</p>
							<p className="ant-upload-text" style={{ margin: 0 }}>
								Drag & drop or click to choose an Excel file
							</p>
							<p className="ant-upload-hint" style={{ margin: 0 }}>
								{selectedSemesterId
									? `Semester: ${selectedSemesterName}`
									: 'Please select a Semester first'}
							</p>
						</Upload.Dragger>

						<Button icon={<DownloadOutlined />} onClick={onDownloadTemplate}>
							Download Template
						</Button>
						<Button icon={<ReloadOutlined />} onClick={onClear}>
							Clear
						</Button>
					</Space>
				</Col>
			</Row>
		</Form>
	);
}

