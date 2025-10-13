import { LeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import React from 'react';

const Header = ({ title, isBack }) => {
    const navigate = useNavigate();

    return (
        <div className="mb-10 flex items-center border-b-2 border-b-slate-700 py-5 text-xl font-bold uppercase">
            {isBack && (
                <LeftOutlined
                    className="mr-5 cursor-pointer hover:text-blue-500"
                    onClick={() => navigate(-1)}
                />
            )}
            <div>{title}</div>
        </div>
    );
};

Header.defaultProps = {
    isBack: false,
};

export default Header;
