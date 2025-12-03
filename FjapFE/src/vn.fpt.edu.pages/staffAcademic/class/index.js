import ClassList from "./ClassList";
import { useLocation } from "react-router-dom";

const ClassPage = () => {
  const location = useLocation();
  // Head Academic route should be read-only
  const readOnly = location.pathname.startsWith('/headOfAcademic');
  return <ClassList readOnly={readOnly} />;
};

export default ClassPage;
