// import React, { useState, useEffect, useCallback } from "react";
// import { Breadcrumb, message, Spin } from "antd";
// import { useAuth } from "../../login/AuthContext";
// import SemesterTabs from "./SemesterTabs";
// import CourseList from "./CourseList";
// import GradeTable from "./GradeTable";
// import StudentGrades from "../../../api/StudentGrades";

// export default function StudentGradeReport() {
//   const { user } = useAuth();
//   const [semesters, setSemesters] = useState([]);
//   const [courses, setCourses] = useState([]);
//   const [selectedSemester, setSelectedSemester] = useState(null);
//   const [selectedCourse, setSelectedCourse] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [coursesLoading, setCoursesLoading] = useState(false);

//   // Wrap loadSemesters với useCallback
//   const loadSemesters = useCallback(async () => {
//     try {
//       setLoading(true);
//       const data = await StudentGrades.getSemesters(user.studentId);
//       setSemesters(data);
//       if (data.length > 0) {
//         setSelectedSemester(data[0]);
//       }
//     } catch (error) {
//       console.error("Failed to load semesters:", error);
//       message.error("Failed to load semesters");
//     } finally {
//       setLoading(false);
//     }
//   }, [user?.studentId]);

//   // Wrap loadCourses với useCallback
//   const loadCourses = useCallback(async () => {
//     if (!selectedSemester || !user?.studentId) return;
    
//     try {
//       setCoursesLoading(true);
//       const data = await StudentGrades.getCourses(
//         user.studentId,
//         selectedSemester.semesterId
//       );
//       setCourses(data);
//       if (data.length > 0) {
//         setSelectedCourse(data[0]);
//       } else {
//         setSelectedCourse(null);
//       }
//     } catch (error) {
//       console.error("Failed to load courses:", error);
//       message.error("Failed to load courses");
//     } finally {
//       setCoursesLoading(false);
//     }
//   }, [user?.studentId, selectedSemester]);

//   // Load semesters khi component mount
//   useEffect(() => {
//     if (user?.studentId) {
//       loadSemesters();
//     }
//   }, [user?.studentId, loadSemesters]);

//   // Load courses khi chọn semester
//   useEffect(() => {
//     if (selectedSemester && user?.studentId) {
//       loadCourses();
//     }
//   }, [selectedSemester, user?.studentId, loadCourses]);

//   if (loading) {
//     return (
//       <div style={{ textAlign: "center", padding: "50px" }}>
//         <Spin size="large" />
//       </div>
//     );
//   }

//   if (!semesters.length) {
//     return (
//       <div style={{ padding: "24px", textAlign: "center" }}>
//         <h2>No grade data available</h2>
//         <p>You don't have any grades recorded yet.</p>
//       </div>
//     );
//   }

//   return (
//     <div style={{ padding: "24px", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
//       <Breadcrumb
//         style={{ marginBottom: 16 }}
//         items={[
//           { title: "Reports" },
//           { title: "Study Report" },
//           { title: "Mark Report" },
//         ]}
//       />

//       <h1 style={{ marginBottom: 24, fontSize: 28, fontWeight: 600 }}>Mark Report</h1>

//       <SemesterTabs
//         semesters={semesters}
//         selectedSemester={selectedSemester}
//         onSelectSemester={(semester) => {
//           setSelectedSemester(semester);
//           setSelectedCourse(null); // Reset selected course khi đổi semester
//         }}
//       />

//       <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: 24 }}>
//         <CourseList
//           courses={courses}
//           selectedCourse={selectedCourse}
//           onSelectCourse={setSelectedCourse}
//           semester={selectedSemester}
//           loading={coursesLoading}
//         />

//         {selectedCourse ? (
//           <GradeTable 
//             course={selectedCourse} 
//             studentId={user.studentId}
//           />
//         ) : (
//           <div style={{ 
//             backgroundColor: "white", 
//             padding: 40, 
//             borderRadius: 8,
//             textAlign: "center",
//             color: "#8c8c8c"
//           }}>
//             <p>Please select a course to view grade details</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


import React, { useState, useEffect, useCallback } from "react";
import { Breadcrumb, message, Spin } from "antd";
import { useAuth } from "../../login/AuthContext";
import SemesterTabs from "./SemesterTabs";
import CourseList from "./CourseList";
import GradeTable from "./GradeTable";
import StudentGrades from "../../../vn.fpt.edu.api/StudentGrades";

export default function StudentGradeReport() {
  const { user } = useAuth();
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(false);

  // Mock studentId nếu không có trong user
  const studentId = user?.studentId || "MOCK_STUDENT_123";

  // Wrap loadSemesters với useCallback
  const loadSemesters = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Loading semesters for student:", studentId);
      const data = await StudentGrades.getSemesters(studentId);
      console.log("Semesters loaded:", data);
      setSemesters(data);
      if (data.length > 0) {
        setSelectedSemester(data[0]);
      }
    } catch (error) {
      console.error("Failed to load semesters:", error);
      message.error("Failed to load semesters");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  // Wrap loadCourses với useCallback
  const loadCourses = useCallback(async () => {
    if (!selectedSemester) return;
    
    try {
      setCoursesLoading(true);
      console.log("Loading courses for semester:", selectedSemester.semesterId);
      const data = await StudentGrades.getCourses(
        studentId,
        selectedSemester.semesterId
      );
      console.log("Courses loaded:", data);
      setCourses(data);
      if (data.length > 0) {
        setSelectedCourse(data[0]);
      } else {
        setSelectedCourse(null);
      }
    } catch (error) {
      console.error("Failed to load courses:", error);
      message.error("Failed to load courses");
    } finally {
      setCoursesLoading(false);
    }
  }, [studentId, selectedSemester]);

  // Load semesters khi component mount
  useEffect(() => {
    loadSemesters();
  }, [loadSemesters]);

  // Load courses khi chọn semester
  useEffect(() => {
    if (selectedSemester) {
      loadCourses();
    }
  }, [selectedSemester, loadCourses]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Loading grade data...</p>
      </div>
    );
  }

  if (!semesters.length) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <h2>No grade data available</h2>
        <p>You don't have any grades recorded yet.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: "Reports" },
          { title: "Study Report" },
          { title: "Mark Report" },
        ]}
      />

      <h1 style={{ marginBottom: 24, fontSize: 28, fontWeight: 600 }}>Mark Report</h1>

      <SemesterTabs
        semesters={semesters}
        selectedSemester={selectedSemester}
        onSelectSemester={(semester) => {
          setSelectedSemester(semester);
          setSelectedCourse(null); // Reset selected course khi đổi semester
        }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: 24 }}>
        <CourseList
          courses={courses}
          selectedCourse={selectedCourse}
          onSelectCourse={setSelectedCourse}
          semester={selectedSemester}
          loading={coursesLoading}
        />

        {selectedCourse ? (
          <GradeTable 
            course={selectedCourse} 
            studentId={studentId}
          />
        ) : (
          <div style={{ 
            backgroundColor: "white", 
            padding: 40, 
            borderRadius: 8,
            textAlign: "center",
            color: "#8c8c8c"
          }}>
            <p>Please select a course to view grade details</p>
          </div>
        )}
      </div>
    </div>
  );
}