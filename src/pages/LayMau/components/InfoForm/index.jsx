import React, {useState} from "react";
import {User, IdCard} from "lucide-react";

export const InfoForm = ({onSubmit}) => {
    const [code, setCode] = useState("");
    const [fullName, setFullName] = useState("");
    const [isStaff, setIsStaff] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!code || !fullName) {
            setError("Vui lòng điền đầy đủ thông tin.");
            return;
        }
        setError(""); // Xóa lỗi nếu hợp lệ
        onSubmit(code, fullName, isStaff);
    };

    return (
        <div className="max-w-md mx-auto w-full p-4">
            <form
                onSubmit={handleSubmit}
                className="bg-white p-8 rounded-lg shadow-md w-full space-y-6"
            >
                {/* Hiển thị thông báo lỗi nếu có */}
                {error && (
                    <div className="text-red-600 text-sm text-center">
                        {error}
                    </div>
                )}

                {/* Student/Staff ID Field */}
                <div>
                    <label htmlFor="code" className="block font-medium text-gray-700 mb-2">
                        Mã sinh viên/Mã cán bộ
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <IdCard className="h-5 w-5 text-gray-400"/>
                        </div>
                        <input
                            id="code"
                            name="code"
                            type="text"
                            required
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                            placeholder="Nhập mã sinh viên/mã cán bộ"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />
                    </div>
                </div>

                {/* Full Name Field */}
                <div>
                    <label htmlFor="fullName" className="block font-medium text-gray-700 mb-2">
                        Họ và tên
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-gray-400"/>
                        </div>
                        <input
                            id="fullName"
                            name="fullName"
                            type="text"
                            required
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                            placeholder="Nhập họ và tên"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                    </div>
                </div>

                {/* Checkbox isStaff */}
                <div className="flex items-center">
                    <input
                        id="isStaff"
                        type="checkbox"
                        checked={isStaff}
                        onChange={(e) => setIsStaff(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isStaff" className="ml-2 block text-sm text-gray-900">
                        Là cán bộ
                    </label>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200"
                >
                    Gửi
                </button>
            </form>
        </div>
    );
};
