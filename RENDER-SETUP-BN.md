# 🍘 HR HABIB — Render + WhatsApp Business QR সেটআপ (বাংলা)

## আগের Pairing Code কেন বাদ দেওয়া হয়েছে?

এই নতুন ZIP-এ Baileys নেই। `whatsapp-web.js` + Chromium-এর মাধ্যমে WhatsApp Web QR স্ক্যান করেই লগইন হবে। ফোন নম্বর বা ৮-অক্ষরের pairing code দিতে হবে না।

## Render-এ কী দিতে হবে?

1. GitHub-এ নতুন ZIP extract করে ভেতরের সব ফাইল রিপোজিটরির root-এ দাও।
2. Render → **New → Web Service** → GitHub Repo → **Language: Docker** নির্বাচন করো। **Node নয়**।
3. Dockerfile: `./Dockerfile`; Root Directory ফাঁকা; Docker Command ফাঁকা। **Build Command লাগে না।**
4. Environment Variables:

| Key | Value |
|---|---|
| `QR_PASSWORD` | নিজের তৈরি অন্তত ১২ অক্ষরের গোপন password |
| `DATA_DIR` | `/app/data` |
| `PREFIX` | `!` |

5. সম্ভব হলে Starter বা বেশি ক্ষমতার Paid Plan ও **Persistent Disk `/app/data` (1 GB)** দাও। Free plan-এ disk নেই; restart বা sleep-এ session নষ্ট হতে পারে।
6. Deploy করে Logs দেখো; `QR code available` এলে `https://YOUR-SERVICE.onrender.com/qr` খুলবে।
7. ওখানে login চাইলে **username: admin**, **password: QR_PASSWORD**।
8. QR-টি **অন্য মোবাইল বা কম্পিউটারে** খুলবে। নিজের WhatsApp Business ফোনে **Linked Devices → Link a Device** দিয়ে QR স্ক্যান করো। **Link with phone number instead চাপবে না।**
9. `https://YOUR-SERVICE.onrender.com/health`-এ `"connected":true` এলে WhatsApp-এ `!ping`, `!help` পাঠাবে।

## যদি আবার error আসে

- Render Logs-এ `QR code available` আছে কিনা দেখো।
- `/qr` page-এ `qr_ready` দেখা যাচ্ছে কিনা দেখো।
- ভুল username/password হলে `/qr` 401 দেখাবে।
- `Chromium initialization failed` দেখালে Docker runtime এবং পর্যাপ্ত RAM আছে কি না পরীক্ষা করো।
- Render Free plan-এ Chromium startup এবং দীর্ঘক্ষণ online থাকা নিশ্চিত নয়।
- একই WhatsApp account-এ বারবার দ্রুত pairing চেষ্টা করো না।
- QR, password, session ফাইল অন্য কাউকে দেবে না।

⚠️ এই library unofficial, তাই WhatsApp account restriction-এর ঝুঁকি আছে; শতভাগ error-free দাবি করা হচ্ছে না।
