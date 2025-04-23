-- schema.sql

CREATE DATABASE IF NOT EXISTS RegistrationDetails;
USE RegistrationDetails;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  user_id         VARCHAR(50) PRIMARY KEY,
  username        VARCHAR(100) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  email           VARCHAR(100) UNIQUE,
  role            VARCHAR(50),
  is_active       BOOLEAN DEFAULT TRUE,
  token           VARCHAR(255),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  patient_id        VARCHAR(50) PRIMARY KEY,
  patient_number    VARCHAR(50),
  salutation_code   VARCHAR(10),
  first_name        VARCHAR(100),
  middle_name       VARCHAR(100),
  last_name         VARCHAR(100),
  gender            VARCHAR(10),
  age               VARCHAR(20),
  dob               DATE,
  mobile_number     VARCHAR(20)
);

-- Addresses table
CREATE TABLE IF NOT EXISTS addresses (
  id                        INT AUTO_INCREMENT PRIMARY KEY,
  patient_id                VARCHAR(50),
  address                   VARCHAR(255),
  address_type              VARCHAR(10),
  suburb                    VARCHAR(100),
  city                      VARCHAR(100),
  state                     VARCHAR(100),
  country                   VARCHAR(100),
  state_id                  VARCHAR(10),
  country_id                VARCHAR(10),
  external_patient_number   VARCHAR(50),
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- Orders header table
CREATE TABLE IF NOT EXISTS orders (
  order_id            VARCHAR(50) PRIMARY KEY,
  patient_id          VARCHAR(50),
  org_code            VARCHAR(50),
  overall_status      VARCHAR(50),
  payment_status      VARCHAR(50),
  visit_id            VARCHAR(50),
  visit_type          VARCHAR(10),
  visit_date          DATETIME,
  client_code         VARCHAR(50),
  refering_doc_code   VARCHAR(50),
  refering_doc_name   VARCHAR(100),
  register_location   VARCHAR(50),
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- Order tests table
CREATE TABLE IF NOT EXISTS order_tests (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  order_id             VARCHAR(50),
  test_id              VARCHAR(50),
  test_code            VARCHAR(50),
  test_name            VARCHAR(255),
  test_value           VARCHAR(50),
  uom_code             VARCHAR(20),
  reference_range      VARCHAR(100),
  is_abnormal          CHAR(1),
  result_captured_at   DATETIME,
  test_status          VARCHAR(50),
  department_name      VARCHAR(100),
  device_id            VARCHAR(50),
  barcode_number       VARCHAR(50),
  FOREIGN KEY (order_id) REFERENCES orders(order_id)
);
