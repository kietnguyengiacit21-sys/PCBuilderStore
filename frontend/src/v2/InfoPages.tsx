import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { STORE_INFO } from "../store-info";
import { CONTACT_LINKS } from "./FloatingContact";

/** Static store pages: about, contact and policies. Wording follows how the system really works. */

export const INFO_PAGES: { path: string; title: string }[] = [
  { path: "/about", title: "Giới thiệu" },
  { path: "/contact", title: "Liên hệ" },
  { path: "/policies/warranty", title: "Chính sách bảo hành" },
  { path: "/policies/returns", title: "Đổi trả và hoàn tiền" },
  { path: "/policies/shipping", title: "Chính sách giao hàng" },
  { path: "/policies/payment", title: "Hình thức thanh toán" },
  { path: "/policies/privacy", title: "Chính sách bảo mật" },
  { path: "/policies/terms", title: "Điều khoản mua hàng" },
];

const POLICY_LINKS = INFO_PAGES.filter((page) => page.path.startsWith("/policies/"));

function ContactLine() {
  const parts = [
    STORE_INFO.hotline && <>hotline <a href={`tel:${STORE_INFO.hotline.replace(/\s+/g, "")}`}>{STORE_INFO.hotline}</a></>,
    STORE_INFO.email && <>email <a href={`mailto:${STORE_INFO.email}`}>{STORE_INFO.email}</a></>,
  ].filter(Boolean);
  return parts.length
    ? <>qua {parts.map((part, index) => <span key={index}>{index ? " hoặc " : ""}{part}</span>)}</>
    : <>qua các kênh trên trang <Link to="/contact">Liên hệ</Link></>;
}

function InfoLayout({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return <div className="v2-page v2-info-page">
    <aside className="v2-info-nav" aria-label="Thông tin cửa hàng">
      <p>Thông tin</p>
      {INFO_PAGES.map((page) => <NavLink key={page.path} to={page.path}>{page.title}</NavLink>)}
    </aside>
    <article className="v2-info-content">
      <p className="v2-eyebrow">{STORE_INFO.name}</p>
      <h1>{title}</h1>
      {intro && <p className="v2-info-intro">{intro}</p>}
      {children}
    </article>
  </div>;
}

export function AboutPage() {
  return <InfoLayout title="Giới thiệu" intro={`${STORE_INFO.name} bán PC lắp sẵn, linh kiện máy tính và gaming gear, với cấu hình minh bạch đến từng linh kiện.`}>
    <h2>Chúng tôi làm gì</h2>
    <ul>
      <li><strong>PC lắp sẵn</strong> cho chơi game, đồ họa, văn phòng và AI — xem rõ từng linh kiện trước khi mua và có thể nâng cấp từng phần.</li>
      <li><strong>Linh kiện và phụ kiện</strong> với thông số kỹ thuật chi tiết, so sánh tối đa 4 sản phẩm cùng lúc.</li>
      <li><strong>Tự build PC</strong>: công cụ gợi ý cấu hình theo nhu cầu và ngân sách, tự kiểm tra tương thích, ước tính hiệu năng, lưu và chia sẻ báo giá.</li>
    </ul>
    <h2>Cam kết khi mua hàng</h2>
    <ul>
      <li>Giá và tồn kho hiển thị lấy trực tiếp từ hệ thống, được kiểm tra lại khi bạn đặt hàng.</li>
      <li>Miễn phí giao hàng; thanh toán khi nhận hàng hoặc chuyển khoản.</li>
      <li>Bảo hành theo thời hạn ghi trên từng sản phẩm — xem <Link to="/policies/warranty">chính sách bảo hành</Link>.</li>
    </ul>
    <p><Link className="v2-button v2-button-primary" to="/customer/parts">Xem sản phẩm</Link></p>
  </InfoLayout>;
}

export function ContactPage() {
  const channels = CONTACT_LINKS.filter((link) => link.href);
  return <InfoLayout title="Liên hệ" intro="Cần tư vấn cấu hình, hỏi tình trạng đơn hàng hay bảo hành? Hãy liên hệ với chúng tôi qua các kênh dưới đây.">
    <div className="v2-contact-grid">
      {STORE_INFO.hotline && <a className="v2-contact-card" href={`tel:${STORE_INFO.hotline.replace(/\s+/g, "")}`}>
        <span aria-hidden="true">📞</span><strong>Hotline</strong><small>{STORE_INFO.hotline}</small></a>}
      {STORE_INFO.email && <a className="v2-contact-card" href={`mailto:${STORE_INFO.email}`}>
        <span aria-hidden="true">✉️</span><strong>Email</strong><small>{STORE_INFO.email}</small></a>}
      {channels.filter((link) => link.key !== "phone" || !STORE_INFO.hotline).map((link) => <a key={link.key} className="v2-contact-card"
        href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{link.icon}</svg>
        <strong>{link.label}</strong><small>Nhắn tin hoặc theo dõi cửa hàng</small></a>)}
      <Link className="v2-contact-card" to="/customer/guest-order-lookup">
        <span aria-hidden="true">📦</span><strong>Tra cứu đơn hàng</strong><small>Bằng mã đơn và số điện thoại</small></Link>
    </div>
    {(STORE_INFO.address || STORE_INFO.workingHours) && <>
      <h2>Cửa hàng</h2>
      {STORE_INFO.address && <p><strong>Địa chỉ:</strong> {STORE_INFO.address}</p>}
      {STORE_INFO.workingHours && <p><strong>Giờ làm việc:</strong> {STORE_INFO.workingHours}</p>}
    </>}
    <h2>Khi liên hệ về đơn hàng</h2>
    <p>Vui lòng cung cấp <strong>mã đơn hàng</strong> (ví dụ PC261122-7KQ4M) và số điện thoại đặt hàng để được hỗ trợ nhanh nhất.</p>
  </InfoLayout>;
}

export function WarrantyPolicyPage() {
  return <InfoLayout title="Chính sách bảo hành" intro="Sản phẩm được bảo hành theo thời hạn ghi trên trang sản phẩm và trên đơn hàng của bạn.">
    <h2>Thời hạn bảo hành</h2>
    <p>Mỗi sản phẩm có thời hạn bảo hành riêng (ví dụ 24 hoặc 36 tháng), hiển thị ở mục “Bảo hành” trên trang sản phẩm.
      Với PC lắp sẵn, từng linh kiện được bảo hành theo thời hạn của chính linh kiện đó.</p>
    <h2>Điều kiện bảo hành</h2>
    <ul>
      <li>Sản phẩm còn trong thời hạn bảo hành, tem bảo hành và số serial còn nguyên vẹn.</li>
      <li>Lỗi phát sinh do nhà sản xuất trong quá trình sử dụng bình thường.</li>
      <li>Có mã đơn hàng hoặc thông tin mua hàng để đối chiếu.</li>
    </ul>
    <h2>Không thuộc phạm vi bảo hành</h2>
    <ul>
      <li>Hư hỏng do rơi vỡ, va đập, vào nước, cháy nổ do nguồn điện không ổn định hoặc thiên tai.</li>
      <li>Sản phẩm đã bị tự ý tháo, sửa chữa hoặc thay đổi linh kiện ngoài cửa hàng/hãng.</li>
      <li>Hao mòn tự nhiên về ngoại hình (trầy xước, phai màu) trong quá trình sử dụng.</li>
    </ul>
    <h2>Cách gửi bảo hành</h2>
    <p>Liên hệ cửa hàng <ContactLine />, cung cấp mã đơn hàng và mô tả lỗi. Cửa hàng sẽ hướng dẫn kiểm tra từ xa hoặc tiếp nhận sản phẩm.</p>
  </InfoLayout>;
}

export function ReturnsPolicyPage() {
  return <InfoLayout title="Đổi trả và hoàn tiền">
    <h2>Hủy đơn trước khi giao</h2>
    <p>Bạn có thể yêu cầu hủy đơn trong trang <Link to="/customer/orders">Đơn hàng của tôi</Link> khi đơn chưa được giao cho đơn vị vận chuyển.
      Khách không đăng nhập vui lòng liên hệ cửa hàng kèm mã đơn hàng.</p>
    <h2>Hoàn tiền</h2>
    <ul>
      <li>Đơn thanh toán khi nhận hàng (COD) và chưa giao: không phát sinh khoản thanh toán nên không cần hoàn tiền.</li>
      <li>Đơn đã chuyển khoản: sau khi cửa hàng duyệt hủy, đơn chuyển sang trạng thái “Chờ hoàn tiền”; cửa hàng chuyển trả đủ số tiền vào tài khoản bạn cung cấp và cập nhật “Đã hoàn tiền” trên đơn.</li>
    </ul>
    <h2>Đổi sản phẩm lỗi</h2>
    <p>{STORE_INFO.defectExchangeDays > 0
      ? `Trong vòng ${STORE_INFO.defectExchangeDays} ngày kể từ khi nhận hàng, sản phẩm lỗi do nhà sản xuất được đổi sản phẩm mới cùng loại (hoặc tương đương nếu hết hàng).`
      : "Sản phẩm lỗi do nhà sản xuất khi vừa nhận hàng sẽ được cửa hàng kiểm tra và đổi mới hoặc bảo hành theo từng trường hợp."}
      {" "}Vui lòng giữ nguyên hộp, phụ kiện và quà tặng kèm theo.</p>
    <h2>Không áp dụng đổi trả</h2>
    <ul>
      <li>Sản phẩm hư hỏng do người dùng, thiếu phụ kiện hoặc quà tặng kèm.</li>
      <li>Đổi ý sau khi đã kích hoạt bản quyền phần mềm hoặc đã sử dụng sản phẩm tiêu hao.</li>
    </ul>
    <p>Mọi yêu cầu đổi trả xin liên hệ <ContactLine />.</p>
  </InfoLayout>;
}

export function ShippingPolicyPage() {
  return <InfoLayout title="Chính sách giao hàng">
    <h2>Phí giao hàng</h2>
    <p><strong>Miễn phí giao hàng</strong> cho mọi đơn hàng. Tổng tiền bạn thấy khi đặt hàng là số tiền cần thanh toán.</p>
    <h2>Quy trình</h2>
    <ol>
      <li>Đặt hàng: bạn nhận mã đơn hàng ngay trên màn hình.</li>
      <li>Xác nhận: cửa hàng gọi điện xác nhận đơn (đơn chuyển khoản được xác nhận sau khi nhận tiền).</li>
      <li>Chuẩn bị hàng: kiểm tra và đóng gói; với PC lắp sẵn, linh kiện được lắp ráp theo đúng cấu hình bạn đã chọn.</li>
      <li>Giao hàng: đơn vị vận chuyển và mã vận đơn được cập nhật trên trang đơn hàng.</li>
    </ol>
    <h2>Khi nhận hàng</h2>
    <p>Vui lòng kiểm tra tình trạng thùng hàng trước khi ký nhận. Nếu thùng bị móp, rách hoặc có dấu hiệu bị mở, hãy từ chối nhận và báo ngay cho cửa hàng.</p>
    <p>Theo dõi đơn hàng tại <Link to="/customer/orders">Đơn hàng của tôi</Link> hoặc <Link to="/customer/guest-order-lookup">Tra cứu đơn hàng</Link>.</p>
  </InfoLayout>;
}

export function PaymentPolicyPage() {
  return <InfoLayout title="Hình thức thanh toán">
    <h2>Thanh toán khi nhận hàng (COD)</h2>
    <p>Bạn trả tiền mặt cho nhân viên giao hàng khi nhận được hàng. Không cần thanh toán trước.</p>
    <h2>Chuyển khoản ngân hàng</h2>
    <p>Khi chọn chuyển khoản (nếu cửa hàng đang mở hình thức này), trang đặt hàng thành công sẽ hiển thị mã VietQR, số tài khoản, số tiền và nội dung chuyển khoản.</p>
    <ul>
      <li>Ghi đúng nội dung chuyển khoản là <strong>mã đơn hàng</strong> để cửa hàng đối soát.</li>
      <li>Đơn được xác nhận và giao đi sau khi cửa hàng nhận được tiền.</li>
      <li>Bạn có thể xem lại thông tin chuyển khoản bất cứ lúc nào trong trang chi tiết đơn hàng.</li>
    </ul>
    <p>Cửa hàng không yêu cầu bạn cung cấp mật khẩu, mã OTP hay thông tin thẻ qua điện thoại hoặc tin nhắn.</p>
  </InfoLayout>;
}

export function PrivacyPolicyPage() {
  return <InfoLayout title="Chính sách bảo mật">
    <h2>Thông tin chúng tôi thu thập</h2>
    <ul>
      <li>Họ tên, số điện thoại, email và địa chỉ giao hàng khi bạn đặt hàng hoặc tạo tài khoản.</li>
      <li>Giỏ hàng, đơn hàng, cấu hình đã lưu và đánh giá sản phẩm bạn gửi.</li>
    </ul>
    <h2>Mục đích sử dụng</h2>
    <p>Thông tin chỉ dùng để xử lý đơn hàng, giao hàng, bảo hành và hỗ trợ bạn. Chúng tôi không bán hay chia sẻ thông tin cá nhân cho bên thứ ba,
      trừ đơn vị vận chuyển (tên, số điện thoại, địa chỉ để giao hàng) hoặc khi pháp luật yêu cầu.</p>
    <h2>Bảo vệ thông tin</h2>
    <ul>
      <li>Mật khẩu được mã hóa một chiều; nhân viên cửa hàng không thể xem mật khẩu của bạn.</li>
      <li>Đăng nhập sai nhiều lần sẽ bị tạm khóa để chống dò mật khẩu.</li>
      <li>Phiên đăng nhập tự hết hạn sau một thời gian không sử dụng.</li>
    </ul>
    <h2>Quyền của bạn</h2>
    <p>Bạn có thể xem và sửa thông tin cá nhân trong trang <Link to="/customer/account">Tài khoản</Link>.
      Để yêu cầu xóa tài khoản, vui lòng liên hệ <ContactLine />.</p>
  </InfoLayout>;
}

export function TermsPage() {
  return <InfoLayout title="Điều khoản mua hàng">
    <h2>Giá và sản phẩm</h2>
    <ul>
      <li>Giá bán và khuyến mãi được xác nhận tại thời điểm bạn bấm “Đặt hàng”; giá trong giỏ có thể thay đổi nếu chương trình khuyến mãi kết thúc.</li>
      <li>Hình ảnh mang tính minh họa; thông số kỹ thuật chính xác theo mã model ghi trên trang sản phẩm.</li>
    </ul>
    <h2>Xác nhận đơn hàng</h2>
    <p>Đơn hàng được xem là xác nhận khi cửa hàng gọi điện xác nhận (đơn COD) hoặc khi nhận được chuyển khoản.
      Cửa hàng có thể từ chối hoặc hủy đơn trong trường hợp sản phẩm hết hàng, sai giá rõ ràng do lỗi hệ thống hoặc không liên lạc được với người nhận;
      khi đó bạn sẽ được thông báo và hoàn tiền đầy đủ nếu đã thanh toán.</p>
    <h2>Tài khoản</h2>
    <p>Bạn chịu trách nhiệm giữ bí mật mật khẩu. Nếu nghi ngờ tài khoản bị truy cập trái phép, hãy đổi mật khẩu ngay hoặc dùng “Quên mật khẩu”.</p>
    <p>Xem thêm: {POLICY_LINKS.filter((page) => page.path !== "/policies/terms").map((page, index) => <span key={page.path}>{index ? " · " : ""}
      <Link to={page.path}>{page.title}</Link></span>)}</p>
  </InfoLayout>;
}

export function infoPageContent(path: string): ReactNode | null {
  switch (path) {
    case "/about": return <AboutPage />;
    case "/contact": return <ContactPage />;
    case "/policies/warranty": return <WarrantyPolicyPage />;
    case "/policies/returns": return <ReturnsPolicyPage />;
    case "/policies/shipping": return <ShippingPolicyPage />;
    case "/policies/payment": return <PaymentPolicyPage />;
    case "/policies/privacy": return <PrivacyPolicyPage />;
    case "/policies/terms": return <TermsPage />;
    default: return null;
  }
}
