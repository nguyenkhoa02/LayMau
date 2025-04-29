import { User, UserCircle } from "lucide-react";
import PropTypes from "prop-types";
import React from "react";

const PersonInformation = ({ persons, type }) => {
  const extractName = (idString) => {
    if (!idString) return "";
    const str = String(idString);
    const parts = str.split("_");
    return parts.length > 1 ? parts.slice(1).join(" ") : idString;
  };
  console.log(persons);
  return (
    <div className="md:col-span-1">
      <div className="h-full bg-white border-gray-200 shadow-md overflow-hidden">
        <div
          className={`p-4 bg-gradient-to-r ${
            type === "recognized"
              ? "from-blue-50 to-white border-b border-blue-200"
              : "from-red-50 to-white border-b border-red-200"
          }`}
        >
          <div className="flex items-center">
            <UserCircle
              className={`mr-2 h-5 w-5 ${type === "recognized" ? "text-blue-500" : "text-red-500"}`}
            />
            <h2 className="text-lg font-medium">
              {type === "recognized" ? "Nhận diện" : "Người lạ"}{" "}
              {/*{type === "recognized" ? persons.length : ""}*/}
            </h2>
          </div>
        </div>

        <div className="p-4 w-full overflow-x-auto">
          <div className="flex flex-nowrap space-x-4 min-w-max">
            {persons.length > 0 ? (
              persons.map((person, index) => (
                <div
                  key={person.id + index}
                  className={`rounded-lg transition-all duration-200 ${
                    index === 0
                      ? type === "recognized"
                        ? "bg-gradient-to-r from-blue-50 to-white border border-blue-200"
                        : "bg-gradient-to-r from-red-50 to-white border border-red-200"
                      : "bg-gray-50 border border-gray-200"
                  } hover:border-blue-300 p-4 shadow-sm`}
                >
                  {/* Image section */}
                  <div className="flex flex-row gap-2 mb-4">
                    <div className="flex items-center justify-center">
                      {person.frame ? (
                        <div className="relative group h-16 w-16 flex items-center justify-center">
                          <img
                            src={`data:image/jpeg;base64,${person.frame}`}
                            alt="Person thumbnail"
                            className="h-full w-full rounded-md object-cover border border-gray-200"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-1 rounded-md">
                            <span className="text-xs text-white">Live</span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-16 w-16 rounded-md bg-gray-100 flex items-center justify-center border border-gray-200">
                          <User className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-center">
                      {person.image_info ? (
                        <div className="relative group h-16 w-16 flex items-center justify-center">
                          <img
                            src={`data:image/jpeg;base64,${person.image_info}`}
                            alt="Profile image"
                            className="h-full w-full rounded-md object-cover border border-gray-200"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-1 rounded-md">
                            <span className="text-xs text-white">Database</span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-16 w-16 rounded-md bg-gray-100 flex items-center justify-center border border-gray-200">
                          <UserCircle className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Info section */}
                    <div className="space-y-0 justify-center content-center">
                      <div className="flex items-center space-x-2 p-1 pt-0">
                        <p className="text-xs text-gray-500">ID</p>
                        <p className="text-sm font-medium truncate">
                          {person.id}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 p-1 pt-0">
                        <p className="text-xs text-gray-500">Name</p>
                        <p className="text-sm font-medium truncate">
                          {extractName(person.name)}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 p-1 pt-0">
                        <p className="text-xs text-gray-500">Time</p>
                        <p className="text-sm font-medium truncate">
                          {person.time.toLocaleString("vi-VN")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <span
                        className={`h-2 w-2 rounded-full ${person.id === "No data" ? "bg-red-500" : "bg-green-500"}  mr-2`}
                      ></span>
                      <span className="text-xs text-gray-500">
                        {person.id !== "No data"
                          ? index === 0
                            ? "Just detected"
                            : "Previously detected"
                          : "Stranger"}
                      </span>
                    </div>
                    {/*<ChevronRight className="h-4 w-4 text-gray-400" />*/}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center text-gray-400">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-gray-300" />
                </div>
                <p>Không có người được phát hiện</p>
                {/*<p className="text-xs mt-2 max-w-[200px]">*/}
                {/*  Waiting for detection events from the camera feed*/}
                {/*</p>*/}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

PersonInformation.propTypes = {
  persons: PropTypes.array.isRequired,
  type: PropTypes.string.isRequired,
};
export default PersonInformation;
