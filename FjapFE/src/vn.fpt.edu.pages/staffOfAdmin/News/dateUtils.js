// Helper để format date (không convert timezone - hiển thị đúng như database)
// Backend dùng DateTime.Now (local time), nên chỉ cần format đơn giản
export const formatDateTimeWithTimezone = (dateStr) => {
  if (!dateStr) return "N/A";
  try {
    let date;
    
    // Nếu date string có 'Z' (UTC indicator), cần xử lý đặc biệt
    // Vì có thể là dữ liệu cũ trong database (UTC) hoặc serialize với Kind=Utc
    if (typeof dateStr === 'string' && dateStr.endsWith('Z')) {
      // Parse như UTC, sau đó cộng thêm 7 giờ để có local time (GMT+7)
      const utcDate = new Date(dateStr);
      if (isNaN(utcDate.getTime())) {
        return dateStr;
      }
      // Cộng thêm 7 giờ (7 * 60 * 60 * 1000 milliseconds)
      const localTimestamp = utcDate.getTime() + (7 * 60 * 60 * 1000);
      date = new Date(localTimestamp);
    } else {
      // Parse như local time (không có 'Z') - dữ liệu mới
      date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr;
      }
    }
    
    // Format output từ local date
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const formattedHours = String(hours).padStart(2, "0");
    
    return `${year}-${month}-${day} ${formattedHours}:${minutes} ${ampm}`;
  } catch (error) {
    console.error("Error in formatDateTimeWithTimezone:", error);
    return dateStr;
  }
};

// Helper riêng cho ApprovedAt - luôn parse như UTC và cộng 7 giờ
// Vì dữ liệu trong database là UTC (dù serialize có 'Z' hay không)
export const formatApprovedAt = (dateStr) => {
  if (!dateStr) return "N/A";
  try {
    // Extract các thành phần từ date string (year, month, day, hour, minute, second)
    const match = typeof dateStr === 'string' 
      ? dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
      : null;
    
    if (!match) {
      // Nếu không match format, thử parse như bình thường
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      // Giả sử là UTC và cộng 7 giờ
      const utcTimestamp = date.getTime();
      const localTimestamp = utcTimestamp + (7 * 60 * 60 * 1000);
      const localDate = new Date(localTimestamp);
      
      // Format từ UTC date (vì đã cộng offset rồi, dùng UTC methods để format)
      const year = localDate.getUTCFullYear();
      const month = String(localDate.getUTCMonth() + 1).padStart(2, "0");
      const day = String(localDate.getUTCDate()).padStart(2, "0");
      let hours = localDate.getUTCHours();
      const minutes = String(localDate.getUTCMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHours = String(hours).padStart(2, "0");
      return `${year}-${month}-${day} ${formattedHours}:${minutes} ${ampm}`;
    }
    
    // Extract các thành phần
    const [, year, month, day, hour, minute, second] = match;
    
    // Tạo UTC timestamp từ các thành phần (dùng Date.UTC để đảm bảo parse như UTC)
    const utcTimestamp = Date.UTC(
      parseInt(year, 10),
      parseInt(month, 10) - 1, // Month is 0-indexed
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second || 0, 10)
    );
    
    // Cộng thêm 7 giờ để có local time (GMT+7)
    const localTimestamp = utcTimestamp + (7 * 60 * 60 * 1000);
    const date = new Date(localTimestamp);
    
    // Format output từ UTC date (vì đã cộng offset rồi, dùng UTC methods để format)
    const outputYear = date.getUTCFullYear();
    const outputMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
    const outputDay = String(date.getUTCDate()).padStart(2, "0");
    
    let outputHours = date.getUTCHours();
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const ampm = outputHours >= 12 ? "PM" : "AM";
    outputHours = outputHours % 12;
    outputHours = outputHours ? outputHours : 12; // 0 should be 12
    const formattedHours = String(outputHours).padStart(2, "0");
    
    return `${outputYear}-${outputMonth}-${outputDay} ${formattedHours}:${minutes} ${ampm}`;
  } catch (error) {
    console.error("Error in formatApprovedAt:", error);
    return dateStr;
  }
};

