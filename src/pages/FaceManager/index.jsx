import React, { useEffect, useState } from 'react';
import { Search, Users } from 'lucide-react';
import Table from '../../Components/Table';
import { useDispatch, useSelector } from 'react-redux';
import { deleteFaceStart, getFacesStart } from '../../redux/faces/slice';
import { useNavigate } from 'react-router-dom';

const FaceManager = () => {
  const [people, setPeople] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('fullName');
  const [sortDirection, setSortDirection] = useState('asc');
  const { data, isLoading, deleteSuccess } = useSelector((state) => state.face);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [limit, setLimit] = useState(5);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    dispatch(getFacesStart({ limit, page }));
  }, [dispatch, limit, page]);

  // Gọi lại API khi xóa thành công
  useEffect(() => {
    if (deleteSuccess) {
      dispatch(getFacesStart({ limit, page }));
    }
  }, [dispatch, deleteSuccess, limit, page]);

  useEffect(() => {
    if (data) {
      setTotalPages(data?.total_pages);
      setPage(data?.current_page);
      setPeople(data?.faces);
    } else {
      setPeople([]);
    }
  }, [data, dispatch]);

  const handleDelete = (id) => {
    if (window.confirm(`Bạn có muốn xóa ${id}?`)) {
      dispatch(deleteFaceStart(id));
    }
  };

  const handleEdit = (item) => {
    navigate(`/faces/${item?.code}`);
  };

  const headers = [
    {
      key: 'image',
      label: 'Ảnh',
      sortable: false,
      render: (item) => (
        <div className="w-12 h-12 rounded-full overflow-hidden">
          {item ? (
            <img
              src={`${process.env.REACT_APP_API_URL}/${item.replace(/\\/g, '/')}`}
              alt={`${item.full_name}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
              N/A
            </div>
          )}
        </div>
      ),
    },
    { key: 'full_name', label: 'Họ tên', sortable: true },
    { key: 'code', label: 'Mã số', sortable: true },
    {
      key: 'is_staff',
      label: 'Vai trò',
      sortable: true,
      render: (item) => (
        <span
          className={`px-2 py-1 rounded-full text-xs ${item ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
        >
          {item ? 'Nhân viên' : 'Sinh viên'}
        </span>
      ),
    },
  ];

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAndFilteredPeople = (people || [])
    .filter(
      (p) =>
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      const valueA = a[sortField] || ''; // Gán giá trị mặc định rỗng nếu undefined
      const valueB = b[sortField] || ''; // Gán giá trị mặc định rỗng nếu undefined
      return direction * valueA.localeCompare(valueB);
    });

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quản lý mẫu</h1>
              {/*<p className="mt-1 text-sm text-gray-500">*/}
              {/*  Manage and organize your face detection entries*/}
              {/*</p>*/}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-5 w-5" />
              <span>{people?.length} Người</span>
            </div>
          </div>

          <div className="mt-4 relative z-10">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Tìm kiếm theo tên hoặc mã số..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="mt-6 flex items-center justify-between">
            {/* Chọn giới hạn record */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Số lượng:</span>
              <select
                className="border-gray-300 rounded-md text-sm px-2 py-1"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>

            {/* Chọn trang */}
            <div className="flex items-center space-x-2">
              <button
                className="px-3 py-1 border rounded-md text-sm bg-gray-200 hover:bg-gray-300"
                disabled={page === 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              >
                Trước
              </button>
              <span className="text-sm text-gray-700">
                Trang {page} / {totalPages}
              </span>
              <button
                className="px-3 py-1 border rounded-md text-sm bg-gray-200 hover:bg-gray-300"
                disabled={page === totalPages}
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              >
                Sau
              </button>
            </div>
          </div>
          {data && !isLoading && (
            <div className={'mt-4'}>
              <Table
                headers={headers}
                data={sortedAndFilteredPeople}
                onSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
                onEdit={(item) => handleEdit(item)}
                onDelete={(code) => handleDelete(code)}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FaceManager;
