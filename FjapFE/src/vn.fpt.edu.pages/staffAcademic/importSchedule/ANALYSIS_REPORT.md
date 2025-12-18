# Phân tích Logic Import Schedule - Báo cáo vấn đề và Giải pháp

## Tổng quan
File được phân tích: `ImportSchedule.js` và các file liên quan

---

## 🔴 VẤN ĐỀ NGHIÊM TRỌNG

### 1. **Mapping Slot và DayOfWeek khi cả hai có nhiều giá trị - Logic không rõ ràng**
**Vị trí:** `ImportSchedule.js` dòng 219-228

**Vấn đề:**
- Khi cả Slot và DayOfWeek có nhiều giá trị, code map theo index
- Nếu độ dài khác nhau, dùng giá trị cuối khi index vượt quá
- Ví dụ: Slot="1,2" và DayOfWeek="2,3,4" sẽ tạo: (Slot=1, Day=2), (Slot=2, Day=3), (Slot=2, Day=4)
- Không rõ đây có phải ý định của user không

**Giải pháp:**
- Nếu độ dài khác nhau, cảnh báo rõ ràng hoặc yêu cầu số lượng bằng nhau
- Hoặc hỗ trợ Cartesian product (tất cả kết hợp) nếu cần

---

### 2. **Slot mapping dựa trên thứ tự mảng - Không đảm bảo**
**Vị trí:** `useValidation.js` dòng 30-37

**Vấn đề:**
- Slot được map dựa trên `index + 1`, giả định timeslots luôn được sắp xếp theo StartTime
- Nếu backend không đảm bảo thứ tự, mapping sẽ sai

**Giải pháp:**
- Backend trả về timeslots đã sắp xếp theo StartTime, hoặc frontend sắp xếp trước khi map
- Hoặc backend trả thêm trường `slotNumber` để map chính xác

---

### 3. **Phát hiện trùng lặp chỉ trong file - Không kiểm tra database**
**Vị trí:** `useValidation.js` dòng 68-77

**Vấn đề:**
- Chỉ kiểm tra trùng trong file, không kiểm tra với lịch đã tồn tại trong database
- Có thể tạo conflict khi lưu

**Giải pháp:**
- Trước khi lưu, gọi API kiểm tra conflict với lịch hiện có
- Hiển thị cảnh báo rõ ràng nếu có conflict

---

### 4. **Thiếu validation cho patterns trùng lặp trong cùng group**
**Vị trí:** `ImportSchedule.js` dòng 299-333 (buildPayloadsByClass)

**Vấn đề:**
- Trong cùng một class+lecturer, có thể có nhiều patterns giống nhau (cùng weekday+timeId+roomId)
- Backend sẽ tạo nhiều lessons trùng lặp

**Giải pháp:**
- Trước khi build payload, deduplicate patterns trong mỗi group
- Hoặc validate và cảnh báo nếu có patterns trùng

---

## 🟡 VẤN ĐỀ TRUNG BÌNH

### 5. **Logic mở rộng row phức tạp và dễ lỗi**
**Vị trí:** `ImportSchedule.js` dòng 53-136 (updateRow)

**Vấn đề:**
- Logic xử lý multiple values phức tạp, khó maintain
- Dễ có edge cases

**Giải pháp:**
- Refactor thành helper functions riêng
- Thêm unit tests cho các edge cases

---

### 6. **Lọc semester quá hạn chế**
**Vị trí:** `useLookups.js` dòng 24-50

**Vấn đề:**
- Chỉ hiển thị semester tương lai (sau current semester)
- Không cho phép import cho current semester

**Giải pháp:**
- Cho phép import cho current semester nếu cần
- Hoặc thêm option để chọn hiển thị current semester

---

### 7. **Xử lý lỗi không đủ chi tiết**
**Vị trí:** `ImportSchedule.js` dòng 335-394 (handleSave)

**Vấn đề:**
- Khi lưu thất bại, chỉ hiển thị message chung
- Không rõ dòng nào/class nào lỗi

**Giải pháp:**
- Hiển thị bảng kết quả chi tiết: class nào thành công/thất bại, lý do cụ thể
- Highlight các dòng có lỗi trong table

---

## 🟢 VẤN ĐỀ NHỎ

### 8. **Thiếu validation cho DayOfWeek hợp lệ**
**Vị trí:** `ImportSchedule.js` và `helpers.js`

**Vấn đề:**
- Không validate DayOfWeek có trong khoảng 2-8 (Mon-Sun)

**Giải pháp:**
- Thêm validation: DayOfWeek phải là 2-8
- Hiển thị lỗi rõ ràng nếu giá trị không hợp lệ

---

### 9. **Xử lý file Excel không đúng format**
**Vị trí:** `ImportSchedule.js` dòng 182-256 (handleUpload)

**Vấn đề:**
- Nếu file thiếu cột hoặc sai tên cột, vẫn parse nhưng dữ liệu rỗng
- Dễ gây nhầm lẫn

**Giải pháp:**
- Validate các cột bắt buộc sau khi parse
- Cảnh báo nếu thiếu hoặc không tìm thấy cột

---

### 10. **Không có rollback khi lưu một phần thành công**
**Vị trí:** `ImportSchedule.js` dòng 356-384

**Vấn đề:**
- Nếu một số class lưu thành công, một số thất bại, không có cơ chế rollback

**Giải pháp:**
- Xem xét transaction ở backend nếu cần atomicity
- Hoặc cung cấp tùy chọn undo cho các class đã lưu thành công

---

## 📋 TÓM TẮT CÁC VẤN ĐỀ CẦN ƯU TIÊN

### Ưu tiên cao:
1. ✅ Kiểm tra conflict với database trước khi lưu
2. ✅ Deduplicate patterns trong cùng group
3. ✅ Cải thiện thông báo lỗi chi tiết
4. ✅ Validate DayOfWeek và các trường bắt buộc
5. ✅ Xử lý mapping Slot/DayOfWeek khi độ dài khác nhau

### Ưu tiên trung bình:
6. Refactor logic mở rộng row
7. Cho phép import cho current semester
8. Validate format file Excel

### Ưu tiên thấp:
9. Rollback mechanism
10. Unit tests

---

## 💡 KHUYẾN NGHỊ

1. **Thêm API kiểm tra conflict** trước khi lưu
2. **Deduplicate patterns** trong `buildPayloadsByClass`
3. **Cải thiện UX** với thông báo lỗi chi tiết và highlight
4. **Thêm validation** cho tất cả input fields
5. **Document rõ ràng** logic mapping Slot/DayOfWeek cho user


