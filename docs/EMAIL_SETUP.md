# 📧 Email Configuration Guide - SUT Conference System

## Overview
คู่มือการตั้งค่าระบบอีเมลสำหรับเว็บไซต์การประชุมนานาชาติของมหาวิทยาลัยเทคโนโลยีสุรนารี

## 🔧 Gmail Configuration for anscse29@g.sut.ac.th

### 1. Enable 2-Factor Authentication
1. เข้าไปที่ Google Account Settings
2. เลือก "Security" 
3. เปิดใช้งาน "2-Step Verification"

### 2. Generate App Password
1. ไปที่ Google Account > Security
2. เลือก "App passwords" (ภายใต้ 2-Step Verification)
3. เลือก "Mail" และ "Other (custom name)"
4. ใส่ชื่อ "SUT Conference System"
5. คัดลอก App Password ที่ได้

### 3. Environment Configuration

#### Development (.env)
```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=anscse29@g.sut.ac.th
SMTP_PASS=your_app_password_here
EMAIL_FROM=anscse29@g.sut.ac.th
```

#### Production (.env.production)
```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=anscse29@g.sut.ac.th
SMTP_PASS=your_secure_app_password
EMAIL_FROM=anscse29@g.sut.ac.th
```

## 📨 Email Templates

### Available Templates
1. **Registration Confirmation** - ยืนยันการลงทะเบียน
2. **Submission Confirmation** - ยืนยันการส่งบทคัดย่อ
3. **Payment Confirmation** - ยืนยันการชำระเงิน
4. **Review Assignment** - มอบหมายงานรีวิว
5. **Deadline Reminder** - แจ้งเตือนกำหนดเวลา
6. **Welcome Email** - อีเมลต้อนรับ

### Template Features
- **Responsive Design** - รองรับทุกอุปกรณ์
- **SUT Branding** - ใช้สีและโลโก้ของ SUT
- **Professional Layout** - เหมาะสำหรับการประชุมวิชาการ
- **Multi-language Ready** - พร้อมรองรับหลายภาษา

## 🎨 Email Design Guidelines

### Color Scheme
```css
/* Primary Colors */
--sut-blue: #1565C0;
--sut-light-blue: #42A5F5;
--sut-gold: #FF6F00;

/* Status Colors */
--success: #2E7D32;
--warning: #F57C00;
--error: #D32F2F;
--info: #1976D2;
```

### Typography
- **Headers**: Arial, sans-serif
- **Body**: Arial, sans-serif
- **Font Sizes**: 12px - 24px
- **Line Height**: 1.6 for readability

### Layout Structure
```
┌─────────────────────────────┐
│         Header              │
│    (SUT Logo + Title)       │
├─────────────────────────────┤
│                             │
│        Email Content        │
│                             │
├─────────────────────────────┤
│         Footer              │
│   (Contact Information)     │
└─────────────────────────────┘
```

## 🔒 Security Considerations

### Email Security
- ใช้ App Password แทน password หลัก
- เปิดใช้งาน 2FA บน Gmail account
- ไม่เก็บ password ในโค้ด
- ใช้ environment variables

### Content Security
- ตรวจสอบ email addresses ก่อนส่ง
- ใช้ rate limiting สำหรับการส่งอีเมล
- Log การส่งอีเมลเพื่อ audit
- ป้องกัน email spoofing

## 📊 Email Analytics

### Tracking Metrics
- **Delivery Rate** - อัตราการส่งสำเร็จ
- **Open Rate** - อัตราการเปิดอ่าน
- **Click Rate** - อัตราการคลิกลิงก์
- **Bounce Rate** - อัตราการส่งไม่สำเร็จ

### Monitoring
```javascript
// Email delivery monitoring
const emailMetrics = {
  sent: 0,
  delivered: 0,
  failed: 0,
  bounced: 0
};
```

## 🚀 Testing Email System

### Development Testing
```bash
# Test email configuration
npm run test:email

# Send test email
curl -X POST http://localhost:5000/api/test/email \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "type": "welcome"}'
```

### Production Testing
1. ทดสอบส่งอีเมลไปยัง test account
2. ตรวจสอบ spam folder
3. ทดสอบ responsive design บนอุปกรณ์ต่างๆ
4. ตรวจสอบ delivery time

## 📋 Email Queue Management

### Queue Configuration
```javascript
// Email queue settings
const queueConfig = {
  maxConcurrency: 5,        // ส่งพร้อมกันสูงสุด 5 อีเมล
  retryAttempts: 3,         // ลองใหม่สูงสุด 3 ครั้ง
  retryDelay: 60000,        // รอ 1 นาทีก่อนลองใหม่
  priority: {
    high: 1,                // อีเมลสำคัญ
    normal: 5,              // อีเมลทั่วไป
    low: 10                 // อีเมลไม่เร่งด่วน
  }
};
```

### Queue Monitoring
- ตรวจสอบ queue length
- Monitor failed emails
- Retry failed deliveries
- Clean up old queue items

## 🌐 Internationalization

### Multi-language Support
```javascript
// Language-specific templates
const templates = {
  en: englishTemplates,
  th: thaiTemplates,
  // Add more languages as needed
};
```

### Localization Features
- **Date/Time Format** - รูปแบบวันที่ตามภาษา
- **Currency Format** - รูปแบบเงินตราตามประเทศ
- **Text Direction** - รองรับ RTL languages
- **Cultural Adaptation** - ปรับเนื้อหาตามวัฒนธรรม

## 🔧 Troubleshooting

### Common Issues

#### 1. Authentication Failed
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```
**Solution**: ตรวจสอบ App Password และ 2FA settings

#### 2. Connection Timeout
```
Error: Connection timeout
```
**Solution**: ตรวจสอบ network และ firewall settings

#### 3. Rate Limiting
```
Error: 550 Daily sending quota exceeded
```
**Solution**: ใช้ email queue และ rate limiting

#### 4. Spam Detection
```
Email delivered to spam folder
```
**Solution**: 
- ใช้ proper SPF/DKIM records
- หลีกเลี่ยง spam keywords
- ใช้ reputable sender domain

### Debug Commands
```bash
# Check email service status
curl http://localhost:5000/api/health/email

# View email queue
curl http://localhost:5000/api/admin/email/queue

# Test SMTP connection
npm run test:smtp
```

## 📞 Support Information

### Contact Details
- **Email**: anscse29@g.sut.ac.th
- **Organization**: Suranaree University of Technology
- **Department**: Computer Science and Engineering
- **Address**: 111 University Avenue, Muang District, Nakhon Ratchasima 30000, Thailand

### Emergency Contacts
- **Technical Support**: IT Department SUT
- **Email Issues**: Gmail Support
- **System Admin**: Conference System Administrator

---

## 📝 Configuration Checklist

### Pre-deployment
- [ ] Gmail App Password generated
- [ ] Environment variables configured
- [ ] Email templates tested
- [ ] SMTP connection verified
- [ ] Rate limiting configured

### Post-deployment
- [ ] Send test emails
- [ ] Monitor delivery rates
- [ ] Check spam folder placement
- [ ] Verify template rendering
- [ ] Test queue functionality

### Maintenance
- [ ] Monitor email metrics
- [ ] Update templates as needed
- [ ] Review security settings
- [ ] Clean up email logs
- [ ] Update contact information

การตั้งค่าตามคู่มือนี้จะทำให้ระบบอีเมลของการประชุมทำงานได้อย่างมีประสิทธิภาพและปลอดภัย! 📧✨