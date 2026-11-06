package com.focusstudy.exports;

public class PersonalDataExportException extends RuntimeException {
    public PersonalDataExportException() {
        super("Dữ liệu vượt giới hạn xuất một lần. Hãy liên hệ người quản lý ứng dụng để xuất đầy đủ.");
    }
}
