import React from "react";
import { useParams } from "react-router-dom";
import SubjectForm from "./SubjectForm";

export default function EditSubject() {
  const { subjectId } = useParams();

  return <SubjectForm mode="edit" subjectId={parseInt(subjectId)} />;
}