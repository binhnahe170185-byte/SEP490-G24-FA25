import React, { Component } from "react";
import "./footer.css";
import {
    FacebookFilled,
    LinkedinOutlined,
    TwitterOutlined,
} from "@ant-design/icons";
import {
    PrinterOutlined,
    PhoneOutlined,
    MailOutlined,
    EnvironmentOutlined,
    ClockCircleOutlined,
} from "@ant-design/icons";

class Footer extends Component {
    render() {
        return (
            <div className="footer-container">
                <div className="social-icons">
                    <a
                        href="https://www.linkedin.com/company/fptjapanholdings/?originalSubdomain=jp"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <LinkedinOutlined style={{ color: "#333", fontSize: "24px" }} />
                    </a>
                    <a
                        href="https://x.com/FPT_FJA?s=21"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <TwitterOutlined style={{ color: "#333", fontSize: "24px" }} />
                    </a>
                    <a
                        href="https://www.facebook.com/FPTJapanAcademy"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <FacebookFilled style={{ color: "#333", fontSize: "24px" }} />
                    </a>
                </div>

                {/* Cột giữa: logo + mô tả */}
                <div className="footer-left">
                    <img
                        src="/FJAP.png"
                        alt="FPT Japan Academy"
                        className="footer-logo"
                    />
                    <p className="footer-desc">
                        FPT Japan Academy — FPT Japan Academy was established, sponsored,
                        and developed by FPT Japan Holdings
                        <br />
                        one of the Top 10 foreign technology companies, with over 3,500
                        employees and more than 450 major clients in Japan.
                    </p>
                </div>
                <div className="footer-right" display="flex">
                    <h4>Contact</h4>
                    <div className="footer-col">
                        <div className="contact-l">
                            {/* Hàng 1: Email + Điện thoại */}
                            <div className="contact-row">
                                <MailOutlined style={{ color: "#333" }} />
                                <span>fjpacademy@fpt.com</span>
                            </div>
                            <div className="contact-row">
                                <PhoneOutlined style={{ color: "#333" }} />
                                <span>03 - 5615 - 1012</span>
                            </div>

                            {/* Hàng 2: Fax + Địa chỉ */}
                            <div className="contact-row">
                                <PrinterOutlined style={{ color: "#333" }} />
                                <span>03 - 5615 - 1013</span>
                            </div>
                        </div>
                        <div className="contact-r">
                            <div className="contact-row">
                                <EnvironmentOutlined style={{ color: "#333" }} />
                                <span>4-3-5 Higashi Nippori Arakawa-ku, Tokyo 116-0014</span>
                            </div>

                            <div className="contact-row">
                                <ClockCircleOutlined style={{ color: "#333" }} />
                                <span>Mon - Fri 9:00 - 18:00</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Footer;
