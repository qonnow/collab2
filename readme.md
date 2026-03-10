# PacketViz — Real-time Encrypted Packet Visualization Dashboard

> ระบบแดชบอร์ดสำหรับแสดงผลแพ็กเก็ตเครือข่ายแบบเรียลไทม์พร้อมการวิเคราะห์การเข้ารหัส  


![Node.js](https://img.shields.io/badge/Node.js-22-green)
![React](https://img.shields.io/badge/React-19-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)

---

## สารบัญ

- [ภาพรวมโปรเจกต์](#ภาพรวมโปรเจกต์)
- [สถาปัตยกรรมระบบ](#สถาปัตยกรรมระบบ)
- [เทคโนโลยีที่ใช้](#เทคโนโลยีที่ใช้)
- [ฟีเจอร์หลัก](#ฟีเจอร์หลัก)
- [วิธีติดตั้งและรันโปรเจกต์](#วิธีติดตั้งและรันโปรเจกต์)
- [ตัวแปรสภาพแวดล้อม](#ตัวแปรสภาพแวดล้อม)
- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [API Documentation](#api-documentation)
- [ภาพหน้าจอ](#ภาพหน้าจอ)
- [ผู้พัฒนา](#ผู้พัฒนา)

---

## ภาพรวมโปรเจกต์

PacketViz เป็นแดชบอร์ดเว็บแอปพลิเคชันสำหรับแสดงผลและวิเคราะห์แพ็กเก็ตเครือข่ายแบบเรียลไทม์ โดยใช้ข้อมูลจำลอง (Simulated Packets) รองรับโปรโตคอล 9 ชนิด มีระบบวิเคราะห์การเข้ารหัส TLS/SSL, Cipher Suite, ใบรับรองดิจิทัล และระบบตรวจจับภัยคุกคาม

## สถาปัตยกรรมระบบ

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
│                                                         │
│  ┌──────────────┐         ┌──────────────────────────┐  │
│  │   Frontend    │  :80   │       Backend            │  │
│  │   (Nginx)     │───────▶│  (Node.js + Express)     │  │
│  │              │  /api/  │       :5000               │  │
│  │  React 19    │  /ws    │  Socket.io               │  │
│  │  Vite 7      │         │  JWT Auth                │  │
│  │  TailwindCSS │         │  Rate Limiting           │  │
│  └──────────────┘         └───────────┬──────────────┘  │
│                                       │                  │
│                           ┌───────────▼──────────────┐  │
│                           │      Supabase            │  │
│                           │    (PostgreSQL)           │  │
│                           │  - packets               │  │
│                           │  - users                 │  │
│                           │  - audit_logs            │  │
│                           └──────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## เทคโนโลยีที่ใช้

### Backend
| เทคโนโลยี | เวอร์ชัน | หน้าที่ |
|-----------|---------|--------|
| Node.js | 22 | Runtime |
| Express | 5 | Web Framework |
| Socket.io | 4 | Real-time Communication |
| Supabase | 2 | ฐานข้อมูล PostgreSQL |
| JSON Web Token | 9 | ระบบยืนยันตัวตน |
| bcryptjs | 3 | เข้ารหัสรหัสผ่าน |
| CryptoJS | 4 | เข้ารหัส AES-256 |
| Helmet | 8 | ความปลอดภัย HTTP Headers |
| express-rate-limit | - | จำกัดจำนวนคำขอ |

### Frontend
| เทคโนโลยี | เวอร์ชัน | หน้าที่ |
|-----------|---------|--------|
| React | 19 | UI Library |
| Vite | 7 | Build Tool |
| Tailwind CSS | 4 | Styling |
| Recharts | 3 | กราฟและแผนภูมิ |
| React Router | 7 | การนำทางหน้า |
| Axios | - | HTTP Client |
| Lucide React | - | ไอคอน |
| Socket.io Client | 4 | WebSocket Client |

### Infrastructure
| เทคโนโลยี | หน้าที่ |
|-----------|--------|
| Docker Compose | จัดการ Container |
| Nginx | Reverse Proxy + Static Files |
| Supabase Cloud | ฐานข้อมูล PostgreSQL |

## ฟีเจอร์หลัก

1. **Dashboard แบบเรียลไทม์** — แสดงสถิติ, กราฟ Traffic Timeline, กราฟกระจายโปรโตคอล (Pie/Bar), ตารางแพ็กเก็ตสด
2. **Packet Explorer** — ตารางแพ็กเก็ตแบบแบ่งหน้า, ฟิลเตอร์ตามโปรโตคอล/การเข้ารหัส/ภัยคุกคาม, แผงรายละเอียดแสดง Cipher Suite และใบรับรอง TLS
3. **เครื่องมือเข้ารหัส** — เข้ารหัส/ถอดรหัส AES-256 พร้อมคัดลอกผลลัพธ์
4. **Threat Monitor** — การ์ดระดับภัยคุกคาม, กราฟ IP ต้นทาง/ปลายทาง, รายการแพ็กเก็ตน่าสงสัยล่าสุด
5. **ตั้งค่าโปรไฟล์** — เปลี่ยนอีเมลและรหัสผ่าน
6. **Admin Panel** — จัดการ Users + เปลี่ยน Role, ดู Audit Logs
7. **ระบบล็อกอิน/สมัครสมาชิก** — JWT Authentication, Password Strength Meter
8. **การจำกัดอัตราคำขอ (Rate Limiting)** — ป้องกัน Brute Force
9. **บันทึกการตรวจสอบ (Audit Logs)** — บันทึกเหตุการณ์ Login/Register/Profile Update
10. **Docker Deployment** — Build และ Deploy ด้วย Docker Compose

## วิธีติดตั้งและรันโปรเจกต์

### ข้อกำหนดเบื้องต้น
- Node.js 20+ (แนะนำ 22)
- Docker & Docker Compose
- บัญชี Supabase (ฟรี)






| ตัวแปร | คำอธิบาย | ค่าเริ่มต้น |
|--------|---------|------------|
| `PORT` | พอร์ต Backend | `5000` |
| `SUPABASE_URL` | URL ของ Supabase Project | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key | - |
| `AES_SECRET_KEY` | คีย์ลับสำหรับเข้ารหัส AES | - |
| `CORS_ORIGIN` | Origin ที่อนุญาต | `*` |

## โครงสร้างโปรเจกต์

```
New folder/
├── Backend/
│   ├── config/
│   │   ├── db.js              # เชื่อมต่อ Supabase
│   │   └── migrate.js         # SQL สำหรับสร้างตาราง
│   ├── middleware/
│   │   └── auth.js            # JWT + RBAC Middleware
│   ├── models/
│   │   ├── Packet.js          # โมเดลแพ็กเก็ต
│   │   ├── User.js            # โมเดลผู้ใช้
│   │   └── AuditLog.js        # โมเดลบันทึกการตรวจสอบ
│   ├── routes/
│   │   ├── authRoutes.js      # เส้นทาง Login/Register/Profile
│   │   ├── packetRoutes.js    # เส้นทาง CRUD แพ็กเก็ต
│   │   ├── statsRoutes.js     # เส้นทางสถิติ
│   │   └── adminRoutes.js     # เส้นทาง Admin
│   ├── services/
│   │   ├── packetService.js   # สร้างแพ็กเก็ตจำลอง
│   │   └── encryptionService.js # เข้ารหัส/ถอดรหัส AES
│   ├── sockets/
│   │   └── packetSocket.js    # จัดการ WebSocket
│   ├── Dockerfile
│   ├── package.json
│   └── server.js              # จุดเริ่มต้นแอป
├── Frontend/
│   ├── src/
│   │   ├── components/        # คอมโพเนนต์ที่ใช้ซ้ำ
│   │   ├── pages/             # หน้าต่างๆ ของแอป
│   │   ├── services/          # API + Socket clients
│   │   ├── App.jsx            # คอมโพเนนต์หลัก + Router
│   │   └── main.jsx           # จุดเริ่มต้น React
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
└── README.md
```

## API Documentation

### Authentication

| Method | Endpoint | คำอธิบาย | Auth |
|--------|----------|---------|------|
| POST | `/api/auth/register` | สมัครสมาชิก | ไม่ต้อง |
| POST | `/api/auth/login` | เข้าสู่ระบบ | ไม่ต้อง |
| GET | `/api/auth/me` | ดูข้อมูลผู้ใช้ปัจจุบัน | Bearer Token |
| PUT | `/api/auth/profile` | อัพเดตโปรไฟล์ | Bearer Token |

### Packets

| Method | Endpoint | คำอธิบาย | Auth |
|--------|----------|---------|------|
| GET | `/api/packets` | ดูแพ็กเก็ตทั้งหมด (แบ่งหน้า) | ไม่ต้อง |
| GET | `/api/packets/:id` | ดูแพ็กเก็ตตาม ID | ไม่ต้อง |
| POST | `/api/packets/encrypt` | เข้ารหัส Payload | ไม่ต้อง |
| POST | `/api/packets/decrypt` | ถอดรหัส Payload | ไม่ต้อง |
| POST | `/api/packets/capture/start` | เริ่มจับแพ็กเก็ต | ไม่ต้อง |
| POST | `/api/packets/capture/stop` | หยุดจับแพ็กเก็ต | ไม่ต้อง |
| GET | `/api/packets/capture/status` | สถานะการจับแพ็กเก็ต | ไม่ต้อง |

**Query Parameters สำหรับ GET `/api/packets`:**
- `page` — หน้าที่ (ค่าเริ่มต้น: 1)
- `limit` — จำนวนต่อหน้า (ค่าเริ่มต้น: 50, สูงสุด: 200)
- `protocol` — กรองตามโปรโตคอล (TCP, UDP, HTTP, HTTPS, DNS, SSH, ICMP, FTP, SMTP)
- `isEncrypted` — กรองตามสถานะเข้ารหัส (true/false)
- `isSuspicious` — กรองตามสถานะน่าสงสัย (true/false)

### Statistics

| Method | Endpoint | คำอธิบาย | Auth |
|--------|----------|---------|------|
| GET | `/api/stats/overview` | สถิติภาพรวม | ไม่ต้อง |
| GET | `/api/stats/protocols` | สถิติแยกตามโปรโตคอล | ไม่ต้อง |
| GET | `/api/stats/timeline` | สถิติตามเวลา | ไม่ต้อง |
| GET | `/api/stats/threats` | สถิติภัยคุกคาม | ไม่ต้อง |
| GET | `/api/stats/top-ips` | IP ที่พบมากที่สุด | ไม่ต้อง |

### Admin (ต้องเป็น admin เท่านั้น)

| Method | Endpoint | คำอธิบาย | Auth |
|--------|----------|---------|------|
| GET | `/api/admin/users` | ดูรายชื่อผู้ใช้ทั้งหมด | Admin |
| PUT | `/api/admin/users/:id/role` | เปลี่ยน Role ผู้ใช้ | Admin |
| GET | `/api/admin/logs` | ดู Audit Logs | Admin |

### WebSocket Events

| Event | ทิศทาง | คำอธิบาย |
|-------|--------|---------|
| `packet:new` | Server → Client | แพ็กเก็ตใหม่ถูกจับ |
| `capture:start` | Client → Server | เริ่มจับแพ็กเก็ต |
| `capture:stop` | Client → Server | หยุดจับแพ็กเก็ต |
| `capture:status` | Server → Client | สถานะการจับแพ็กเก็ต |





