import React from "react";

const ProgressBar = ({progress}) => {
    return (
        <div className="w-full max-w-md mx-auto mb-8">
            <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                    <div>
                        <span
                            className="text-xs font-semibold inline-block py-1 px-2 rounded-full text-blue-600 bg-blue-200">
                            Tiến độ thu thập
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-semibold inline-block text-blue-600">
                            {Math.round(progress)}%
                        </span>
                    </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                    <div
                        style={{
                            width: `${progress}%`,
                            transition: "width 0.5s ease-in-out",
                        }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                    />
                </div>
            </div>
        </div>
    );
};

export default ProgressBar;
