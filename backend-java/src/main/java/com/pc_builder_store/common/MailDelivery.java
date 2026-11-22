package com.pc_builder_store.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * Plain-text transactional email. Without SMTP settings (spring.mail.host) nothing is sent and the
 * important part of the message (a link or a code) is written to the server log instead, which is
 * meant for local development only.
 */
@Component
public class MailDelivery {

    private static final Logger logger = LoggerFactory.getLogger(MailDelivery.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String mailFrom;

    public MailDelivery(
            ObjectProvider<JavaMailSender> mailSender,
            @Value("${app.mail.from:no-reply@pcbuilderstore.local}") String mailFrom) {
        this.mailSender = mailSender;
        this.mailFrom = mailFrom;
    }

    public boolean isConfigured() {
        return mailSender.getIfAvailable() != null;
    }

    /**
     * Sends the message, or logs {@code developmentNote} when mail is not configured.
     * Failures are logged for operators and never surface to the caller.
     *
     * @return true when the message was handed to the SMTP server
     */
    public boolean send(String to, String subject, String text, String developmentNote) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            logger.warn("Mail is not configured (spring.mail.host); email to {} not sent. {}", to, developmentNote);
            return false;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        try {
            sender.send(message);
            return true;
        } catch (MailException exception) {
            logger.error("Could not send email \"{}\" to {}", subject, to, exception);
            return false;
        }
    }
}
