package com.example.productapi;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    // Gönderen adresi; ayarlanmazsa SMTP kullanıcı adı kullanılır.
    @Value("${app.mail.from:${spring.mail.username:no-reply@stackboot.local}}")
    private String fromAddress;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // Doğrulama kodunu kullanıcının e-posta adresine gönderir.
    public void sendVerificationCode(String toEmail, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(toEmail);
        message.setSubject("StackBoot - E-posta Doğrulama Kodu");
        message.setText(
                "Merhaba,\n\n" +
                "StackBoot hesabınızı doğrulamak için kodunuz: " + code + "\n\n" +
                "Bu kod 15 dakika içinde geçerliliğini yitirecektir.\n\n" +
                "Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz."
        );
        mailSender.send(message);
    }
}
