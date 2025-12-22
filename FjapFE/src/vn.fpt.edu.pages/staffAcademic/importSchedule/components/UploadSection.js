import React from 'react';
import { Upload, Button, Space, Row, Col, Form, Select, Divider } from 'antd';
import {
	UploadOutlined,
	DownloadOutlined,
	ReloadOutlined,
} from '@ant-design/icons';

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
			<Row gutter={[24, 16]}>
				{/* LEFT: Semester + actions */}
				<Col xs={24} md={8}>
					<Form.Item
						label="Semester"
						name="semesterId"
						rules={[{ required: true, message: 'Please choose Semester' }]}
					>
						<Select
							placeholder="Select semester"
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

					{/* Action buttons under Select */}
					<Space style={{ marginTop: 8 }}>
						<Button
							icon={<DownloadOutlined />}
							onClick={onDownloadTemplate}
						>
							Download Template
						</Button>

						<Button
							icon={<ReloadOutlined />}
							onClick={onClear}
							danger
						>
							Clear
						</Button>
					</Space>
				</Col>

				{/* RIGHT: Upload */}
				<Col xs={24} md={16}>
					<Upload.Dragger
						name="file"
						accept=".xlsx,.xls"
						beforeUpload={onUpload}
						showUploadList={false}
						disabled={!selectedSemesterId}
						style={{
							height: 160,
							borderRadius: 12,
						}}
					>
						<p className="ant-upload-drag-icon">
							<UploadOutlined style={{ fontSize: 36, color: '#1677ff' }} />
						</p>
						<p className="ant-upload-text">
							Drag & drop or click to upload Excel file
						</p>
						<p className="ant-upload-hint">
							{selectedSemesterId
								? `Selected semester: ${selectedSemesterName}`
								: 'Please select a Semester first'}
						</p>
					</Upload.Dragger>
				</Col>
			</Row>
		</Form>
	);
}
