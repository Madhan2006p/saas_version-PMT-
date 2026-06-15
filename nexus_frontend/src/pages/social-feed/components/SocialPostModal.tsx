import { useState } from "react";
import { Modal, Form, Input, Upload, Button, message, Switch } from "antd";
import { UploadOutlined, InboxOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { socialFeedApi, type SocialPostItem, type SocialPostCreate } from "@/services/socialFeed";

const { Dragger } = Upload;
const { TextArea } = Input;

interface SocialPostModalProps {
  open: boolean;
  onClose: () => void;
  editPost?: SocialPostItem | null;
}

export default function SocialPostModal({ open, onClose, editPost }: SocialPostModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const isEdit = !!editPost;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["social-feed"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: SocialPostCreate) => socialFeedApi.create(data),
    onSuccess: () => {
      message.success("Post created successfully!");
      form.resetFields();
      setImageFile(null);
      setAttachmentFile(null);
      refresh();
      onClose();
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail || e?.response?.data?.message || "Failed to create post";
      message.error(detail);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<SocialPostCreate>) =>
      socialFeedApi.update(editPost!.id, data),
    onSuccess: () => {
      message.success("Post updated successfully!");
      form.resetFields();
      setImageFile(null);
      setAttachmentFile(null);
      refresh();
      onClose();
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail || e?.response?.data?.message || "Failed to update post";
      message.error(detail);
    },
  });

  const handleSubmit = (values: any) => {
    const payload: SocialPostCreate = {
      title: values.title,
      content: values.content || "",
      image: imageFile,
      attachment: attachmentFile,
      is_company_wide: values.is_company_wide ?? true,
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setImageFile(null);
    setAttachmentFile(null);
    onClose();
  };

  return (
    <Modal
      title={isEdit ? "Edit Post" : "Create New Post"}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={600}
      destroyOnHidden
      styles={{ body: { paddingTop: 16 } }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          title: editPost?.title || "",
          content: editPost?.content || "",
          is_company_wide: editPost?.is_company_wide ?? true,
        }}
      >
        <Form.Item
          name="title"
          label="Post Title"
          rules={[{ required: true, message: "Please enter a title" }]}
        >
          <Input placeholder="What's on your mind?" style={{ borderRadius: 8 }} />
        </Form.Item>

        <Form.Item name="content" label="Description / Content">
          <TextArea rows={4} placeholder="Write something..." style={{ borderRadius: 8 }} />
        </Form.Item>

        <Form.Item name="image" label="Image">
          <Dragger
            accept="image/*"
            showUploadList={false}
            beforeUpload={(file) => {
              setImageFile(file);
              return false;
            }}
            style={{ borderRadius: 8 }}
          >
            {imageFile ? (
              <div>
                <InboxOutlined style={{ fontSize: 32, color: "#1677ff" }} />
                <p style={{ margin: 4 }}>{imageFile.name}</p>
              </div>
            ) : (
              <div>
                <UploadOutlined style={{ fontSize: 24, color: "#999" }} />
                <p>Click or drag image to upload</p>
                <p style={{ fontSize: 11, color: "#999" }}>Supports: JPG, PNG, GIF</p>
              </div>
            )}
          </Dragger>
        </Form.Item>

        <Form.Item name="attachment" label="File Attachment">
          <Dragger
            showUploadList={false}
            beforeUpload={(file) => {
              setAttachmentFile(file);
              return false;
            }}
            style={{ borderRadius: 8 }}
          >
            {attachmentFile ? (
              <div>
                <UploadOutlined style={{ fontSize: 24, color: "#1677ff" }} />
                <p style={{ margin: 4 }}>{attachmentFile.name}</p>
              </div>
            ) : (
              <div>
                <UploadOutlined style={{ fontSize: 24, color: "#999" }} />
                <p>Click or drag file to attach</p>
              </div>
            )}
          </Dragger>
        </Form.Item>

        <Form.Item name="is_company_wide" label="Company Wide" valuePropName="checked">
          <Switch checkedChildren="Yes" unCheckedChildren="No" defaultChecked />
        </Form.Item>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={createMutation.isPending || updateMutation.isPending}
            style={{ borderRadius: 8 }}
          >
            {isEdit ? "Update Post" : "Create Post"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
