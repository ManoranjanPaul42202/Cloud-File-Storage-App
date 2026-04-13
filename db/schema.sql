-- files table with user_id, visibility, and upload_date
CREATE TABLE IF NOT EXISTS files (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  s3_key VARCHAR(1024) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
  visibility ENUM('private','shared','public') NOT NULL DEFAULT 'private',
  upload_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user_id (user_id),
  INDEX idx_visibility (visibility)
);

-- file_shares table for shared access and permissions
CREATE TABLE IF NOT EXISTS file_shares (
  id INT NOT NULL AUTO_INCREMENT,
  file_id INT NOT NULL,
  shared_with_user_id INT NOT NULL,
  permission ENUM('view','download') NOT NULL DEFAULT 'view',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_file_user (file_id, shared_with_user_id),
  INDEX idx_shared_with_user_id (shared_with_user_id),
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- users table
CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
