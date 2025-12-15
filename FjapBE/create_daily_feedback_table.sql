-- Create dailyfeedbacks table
CREATE TABLE IF NOT EXISTS `dailyfeedbacks` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `student_id` INT NOT NULL COMMENT 'ID của student gửi feedback',
  `lesson_id` INT NOT NULL COMMENT 'ID của lesson được feedback',
  `class_id` INT NOT NULL COMMENT 'ID của class',
  `subject_id` INT NOT NULL COMMENT 'ID của subject',
  `feedback_text` TEXT NOT NULL COMMENT 'Nội dung feedback',
  `feedback_text_transcript` TEXT NULL COMMENT 'Transcript từ speech-to-text (nếu có)',
  `sentiment` ENUM('Positive', 'Neutral', 'Negative') NOT NULL DEFAULT 'Neutral',
  `urgency` INT NOT NULL DEFAULT 0 COMMENT '0-10, urgency >= 7 sẽ gửi notification',
  `status` ENUM('New', 'Reviewed', 'Actioned') NOT NULL DEFAULT 'New',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_daily_feedback_student_lesson` (`student_id`, `lesson_id`),
  KEY `idx_daily_feedback_class` (`class_id`),
  KEY `idx_daily_feedback_created` (`created_at`),
  KEY `idx_daily_feedback_lesson` (`lesson_id`),
  KEY `idx_daily_feedback_student` (`student_id`),
  KEY `idx_daily_feedback_subject` (`subject_id`),
  KEY `idx_daily_feedback_sentiment` (`sentiment`),
  KEY `idx_daily_feedback_status` (`status`),
  CONSTRAINT `fk_daily_feedback_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_daily_feedback_lesson` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`lesson_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_daily_feedback_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`class_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_daily_feedback_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`subject_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Bảng lưu daily feedback của student cho từng lesson';

