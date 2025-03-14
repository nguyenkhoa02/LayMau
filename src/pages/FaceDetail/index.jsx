import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@mui/material';
import { Loader2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { getFaceStart } from '../../redux/faces/slice';

const FaceDetail = () => {
  const { code } = useParams();
  const dispatch = useDispatch();

  const { data, isLoading } = useSelector((state) => state.face);

  useEffect(() => {
    dispatch(getFaceStart(code));
    console.log(isLoading, data);
  }, [code, dispatch]);

  const loader = () => (
    <div className={'w-full h-screen flex items-center justify-center'}>
      <Loader2 className="h-16 w-16 text-blue-300 animate-spin" />
    </div>
  );
  return (
    <div className="container mx-auto py-8 px-4">
      {isLoading ? (
        loader()
      ) : data ? (
        <>
          <Card className="md:col-span-2 lg:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                {data.images && data.images.length > 0 ? (
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <img
                      src={`${process.env.REACT_APP_API_URL}/${data.images[data.images.length - 1].replace(/\\/g, '/')}`}
                      alt={`${data.full_name}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                    N/A
                  </div>
                )}
                <h2 className="text-2xl font-bold">{data.full_name}</h2>
                <p className="text-muted-foreground mb-4">
                  {data.is_staff ? 'Nhân viên' : 'Sinh viên'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4 md:col-span-2 lg:col-span-3">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">Hình ảnh</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-4">
                {Array.isArray(data?.images) &&
                  data.images.map((item, index) => (
                    <div
                      key={index}
                      className="aspect-square relative rounded-md overflow-hidden border"
                    >
                      <img
                        src={`${process.env.REACT_APP_API_URL}/${item.replace(/\\/g, '/')}`}
                        alt={`Project ${index}`}
                        className="object-cover w-full h-full transition-transform hover:scale-105"
                      />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div></div>
      )}
    </div>
  );
};
export default FaceDetail;
