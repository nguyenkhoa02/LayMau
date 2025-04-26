import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";

const Navbar = ({ navigation }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex items-center space-x-8 border-b border-gray-300 p-4">
      {navigation.map((item) => (
        <button
          key={item.name}
          onClick={() => navigate(item.url)}
          className={`text-sm font-medium focus:outline-none ${
            location.pathname === item.url
              ? "border-b-2 border-black text-black"
              : "text-gray-500 hover:text-black"
          }`}
        >
          {item.name}
        </button>
      ))}
    </div>
  );
};

Navbar.propTypes = {
  navigation: PropTypes.func.isRequired,
};

export default Navbar;
