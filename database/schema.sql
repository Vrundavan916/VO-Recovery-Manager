-- BK Recovery Manager Database Schema
-- Version 0.03

CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_name VARCHAR(150) NOT NULL,
    village VARCHAR(100),
    mobile VARCHAR(20),
    total_bill DECIMAL(12,2),
    received_amount DECIMAL(12,2),
    outstanding DECIMAL(12,2),
    next_followup DATE,
    employee VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
