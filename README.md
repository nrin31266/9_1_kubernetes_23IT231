# Bài thực hành 9.1 — Kubernetes

Sinh viên thực hiện: **Nguyễn Văn Rin — 23IT231**

Thực hành trên Minikube: chạy Pod, triển khai Deployment, tự phục hồi,
tăng giảm số bản sao và cập nhật ứng dụng bằng RollingUpdate/Recreate.

## Các file trong bài

| File | Nội dung |
| --- | --- |
| `nginx.yaml` | Pod chạy Nginx |
| `apache.yaml` | Pod chạy Apache HTTP Server |
| `deployment.yaml` | hellok8s v2, 3 bản sao, RollingUpdate |
| `deployment-recreate.yaml` | hellok8s v2, 3 bản sao, Recreate |
| `server.js`, `Dockerfile` | Ứng dụng Node.js thay thế nếu image mẫu không dùng được |

## Chạy cấu hình chính

Cần Docker, Minikube và kubectl; Minikube phải đang chạy và kubectl dùng
đúng context. Các YAML hiện dùng image mẫu `brianstorti/hellok8s:v2`.

```bash
kubectl apply -f deployment.yaml
kubectl rollout status deployment/hellok8s --timeout=180s
kubectl get deployments
kubectl get pods -l app=hellok8s
kubectl port-forward deployment/hellok8s 1234:4567
```

Giữ Terminal port-forward chạy, mở Terminal khác:

```bash
curl http://localhost:1234
```

Kết quả mong đợi: `[v2] Hello, Kubernetes!`.
Có thể mở `http://localhost:1234` trên trình duyệt.

## Các bước thực hành

1. Đặt `replicas: 1`, image `brianstorti/hellok8s:v1`, apply và kiểm tra v1.
2. Ghi lại tên Pod, xóa một Pod rồi quan sát Pod mới được tạo thay thế.
3. Sửa `replicas: 10`, apply và đợi Deployment đạt `10/10`.
4. Sửa `replicas: 2`, apply và đợi chỉ còn hai Pod hoạt động.
5. Đổi image sang v2, apply và theo dõi rollout. Mở lại port-forward để kiểm tra v2.
6. Đặt 3 bản sao với RollingUpdate, `maxSurge: 1`, `maxUnavailable: 1`.
   Đổi image v1/v2 để quan sát một lần cập nhật thực sự.
7. Dùng `deployment-recreate.yaml` riêng để thử Recreate: chạy v1 trước,
   theo dõi Pod rồi sửa thành v2 và apply. File lưu trong repo là bản v2 cuối cùng.

Lệnh theo dõi trước khi apply thay đổi image:

```bash
kubectl get pods -l app=hellok8s --watch
```

RollingUpdate thay dần Pod cũ bằng Pod mới. Với 3 bản sao, cấu hình cho phép
thêm 1 bản sao trong lúc cập nhật và tối đa 1 bản sao không sẵn sàng
(Pod đang kết thúc có thể tạm thời làm tổng số Pod hiển thị cao hơn).
Recreate dừng các Pod cũ trước khi tạo Pod mới và có thể gây gián đoạn.
Chỉ thay số bản sao hoặc strategy không kích hoạt rollout; cần thay Pod template,
chẳng hạn đổi image.

Thử và dọn Deployment Recreate khi hoàn tất:

```bash
kubectl apply -f deployment-recreate.yaml
kubectl rollout status deployment/hellok8s-recreate --timeout=180s
kubectl get pods -l app=hellok8s-recreate
kubectl delete -f deployment-recreate.yaml
```

## Trạng thái kiểm tra ngày 04/11/2026

- Kubernetes v1.37.2 trên Minikube, node Ready.
- Deployment hellok8s có 3/3 bản sao sẵn sàng, chạy image mẫu v2.
- RollingUpdate: `maxSurge: 1`, `maxUnavailable: 1`.
- Pod Apache đang chạy; Nginx và Deployment Recreate không còn trên cluster.
- Bốn file YAML hợp lệ qua `kubectl apply --dry-run=server`.
- Kiểm tra HTTP image mẫu trên cluster thành công: `[v2] Hello, Kubernetes!`.
- Mã Node.js local trả HTTP 200 với đúng nội dung v1 và v2; chưa build image local.

Đây là trạng thái tại thời điểm kiểm tra; không thay thế ảnh minh chứng từng bước.

## Phương án thay thế: image Node.js local

Ứng dụng dùng thư viện HTTP chuẩn, không cần npm package, lắng nghe
`0.0.0.0:4567`. v1 trả `[v1] Hello, Kubernetes!`, v2 trả `[v2] Hello, Kubernetes!`.
Các bước bên dưới chỉ cần khi muốn dùng image local thay image mẫu.

## 1. Build hai image

Chạy tại thư mục chứa Dockerfile:

```bash
docker build --build-arg VERSION=v1 -t hellok8s-local:v1 .
docker build --build-arg VERSION=v2 -t hellok8s-local:v2 .
docker images hellok8s-local
```

Dockerfile dùng Node.js 24 LTS. Không cần tài khoản hoặc push image lên
Docker Hub; lần build đầu vẫn cần mạng để tải base image `node:24-alpine`
nếu máy chưa có sẵn.

## 2. Kiểm tra bằng Docker

Ở Terminal thứ nhất, chạy v1:

```bash
docker run --rm --name hellok8s-check -p 127.0.0.1:1234:4567 hellok8s-local:v1
```

Ở Terminal khác:

```bash
curl http://localhost:1234
```

Kết quả: `[v1] Hello, Kubernetes!`. Có thể mở cùng URL trên trình duyệt.
Dừng container bằng `docker stop hellok8s-check`, rồi thử v2:

```bash
docker run --rm --name hellok8s-check -p 127.0.0.1:1234:4567 hellok8s-local:v2
```

Chạy lại curl, kết quả phải là `[v2] Hello, Kubernetes!`.
Dừng container trước khi dùng cổng 1234 để port-forward.

## 3. Nạp image vào Minikube

Đảm bảo Minikube đang chạy, sau đó nạp cả hai image:

```bash
minikube image load hellok8s-local:v1
minikube image load hellok8s-local:v2
minikube image ls
```

Image trong Docker của máy chủ chưa đồng nghĩa image đã có trong Minikube.
Nếu dùng nhiều profile, thêm `-p TEN_PROFILE` vào lệnh Minikube và dùng đúng
context tương ứng trong kubectl.

## 4. Tự tạo Deployment trong bài thực hành

Để chuyển sang image local, sửa `deployment.yaml` theo mẫu sau (mẫu bắt đầu với 1 bản sao):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hellok8s
spec:
  replicas: 1
  selector:
    matchLabels:
      app: hellok8s
  template:
    metadata:
      labels:
        app: hellok8s
    spec:
      containers:
        - name: hellok8s-container
          image: hellok8s-local:v1
          imagePullPolicy: Never
          ports:
            - containerPort: 4567
```

`imagePullPolicy: Never` yêu cầu Kubernetes chỉ dùng image có trên node,
không tải từ registry. Nếu gặp `ErrImageNeverPull`, kiểm tra tên/tag image
và nạp lại vào đúng profile Minikube.

Các lệnh để bạn tự thực hiện:

```bash
kubectl apply -f deployment.yaml
kubectl rollout status deployment/hellok8s --timeout=180s
kubectl get deployments
kubectl get pods -l app=hellok8s
kubectl port-forward deployment/hellok8s 1234:4567
```

Giữ Terminal port-forward chạy, mở Terminal khác và kiểm tra:

```bash
curl http://localhost:1234
```

Để cập nhật v2, sửa image thành `hellok8s-local:v2`, giữ
`imagePullPolicy: Never`, rồi apply lại và đợi rollout hoàn thành.
Dừng port-forward cũ bằng Ctrl+C và mở lại trước khi kiểm tra phản hồi v2.

## Chạy trực tiếp bằng Node.js (tùy chọn)

```bash
APP_VERSION=v1 node server.js
```

Mở `http://localhost:4567`. Dừng bằng Ctrl+C rồi chạy với `APP_VERSION=v2`
để kiểm tra phiên bản còn lại.
