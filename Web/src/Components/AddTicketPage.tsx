"use client";
import React, { useState, useEffect } from "react";
import RichTextEditor from "@/Hooks/RichTextEditor";
import { useRouter } from "next/navigation";
import ScrollToTopButton from "@/Hooks/useScrollTopButton";
import "bootstrap/dist/css/bootstrap.min.css"; 
import {
  TextField,
  Button,
  Box,
  Autocomplete,
  Typography,
} from "@mui/material";
import Cookies from "js-cookie";
import "@/Css/AddTicketModal.css";
import uploadImageForTicket from "@/models/UpdateImage";
import AddressFields from "@/Hooks/location";


interface FormDataType {
  name: string;
  cost: string;
  location: string;
  date: string;
  image: string;
  description: string;
  Qrcode: string[]; // Change this to an array of files
  categories: Category[];
}

interface Category {
  categoryId: string;
  name: string;
}

const AddTicketModal: React.FC = () => {
  const initialFormData: FormDataType = {
    name: "",
    cost: "",
    location: "",
    date: "",
    image: "",
    description: "",
    Qrcode: [],
    categories: [],
  };

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [qrFileNames, setQrFileNames] = useState(Array(quantity).fill(""));
  const [qrFiles, setQrFiles] = useState(Array(quantity).fill(null));
  const router = useRouter();
  const [minDateTime, setMinDateTime] = useState("");

  const [houseNumber, setHouseNumber] = useState<string>("");
 
  useEffect(() => {
    // Function to format the current date and time to the 'datetime-local' format
    const getCurrentDateTime = () => {
      const now = new Date();
      return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16); // Format as "YYYY-MM-DDTHH:MM"
    };

    // Set the minimum date to the current date and time
    setMinDateTime(getCurrentDateTime());
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://${process.env.NEXT_PUBLIC_API_URL}/api/Category/read`);
      const result = await response.json();

      if (Array.isArray(result.data)) {
        setCategories(result.data);
      } else {
        console.error("Expected array but got:", result.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
  
    if (name === "cost") {
     
      let baseValue = value.replace(/000$/, '');
  
     
      baseValue = baseValue.replace(/\D/g, '');
  
   
      setFormData({
        ...formData,
        [name]: baseValue + '000',
      });
    } else if (name === "date") {
     
      const newDate = new Date(value);
      const minDate = new Date(minDateTime);
  
     
      if (newDate < minDate) {
       
        alert("Selected date is before the minimum allowed date.");
        return; 
      }
  
      
      setFormData({
        ...formData,
        [name]: value,
      });
    } else {
      
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };
  
  
  const handleCategoriesChange = (
    event: React.SyntheticEvent<Element, Event>,
    value: Category[]
  ) => {
    setFormData({
      ...formData,
      categories: value,
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setFormData((prevData) => ({
        ...prevData,
        image: file.name,
      }));

      const imageUrl = URL.createObjectURL(file);
      setImagePreview(imageUrl);
    }
  };

  const handleQrFileChange = async (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files && event.target.files.length > 0) {
      const files = Array.from(event.target.files);
      const newQrFiles = [...qrFiles];
      const newQrFileNames = [...qrFileNames];

      // Loop through each selected file and place it into the corresponding array slot
      files.forEach((file, fileIndex) => {
        const reader = new FileReader();

        reader.onloadend = () => {
          const targetIndex = index + fileIndex; // Calculate where to place the file

          // Place the file and file name in the corresponding index
          newQrFiles[targetIndex] = reader.result as string;
          newQrFileNames[targetIndex] = file.name;

          setQrFiles([...newQrFiles]);
          setQrFileNames([...newQrFileNames]);

          setFormData((prevData) => ({
            ...prevData,
            qr: newQrFiles,
          }));
        };

        reader.readAsDataURL(file);
      });
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(newQuantity);

    setQrFiles((prevFiles) => {
      const updatedFiles = [...prevFiles];
      while (updatedFiles.length < newQuantity) {
        updatedFiles.push(null);
      }
      return updatedFiles.slice(0, newQuantity);
    });

    setQrFileNames((prevNames) => {
      const updatedNames = [...prevNames];
      while (updatedNames.length < newQuantity) {
        updatedNames.push("");
      }
      return updatedNames.slice(0, newQuantity);
    });
  };



  const handleSave = async () => {
    const sellerId = Cookies.get("id");
    if (
      !formData.name ||
      !formData.cost ||
      !formData.location ||
      !formData.date ||
      !formData.image ||
      !formData.description ||
      !formData.Qrcode
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    const generateTicketId = () => {
      const randomNum = Math.floor(100 + Math.random() * 900);
      return `TICKET${randomNum}`;
    };

    const checkTicketIdExist = async (ticketId: string) => {
      const response = await fetch(
        `http://${process.env.NEXT_PUBLIC_API_URL}/api/Ticket/checkexist/${ticketId}`
      );
      return response.status === 200;
    };

    const createTickets = async () => {
      let baseTicketId = generateTicketId();
      let isValidId = await checkTicketIdExist(baseTicketId);

      while (isValidId) {
        baseTicketId = generateTicketId();
        isValidId = await checkTicketIdExist(baseTicketId);
      }

      const tickets = Array.from({ length: quantity }).map((_, index) => {
        let ticketId = baseTicketId;
        if (quantity > 1) {
          ticketId = `${baseTicketId}_${index + 1}`;
        }

        return {
          TicketId: ticketId,
          SellerId: sellerId,
          Name: formData.name,
          Cost: parseFloat(formData.cost),
          Location: formData.location,
          StartDate: new Date(formData.date),
          Status: 1,
          Image: baseTicketId,
          Qrcode: qrFiles[index],
          CategoriesId: formData.categories.map(
            (category) => category.categoryId
          ),
          Description: formData.description,
        };
      });

      console.log(tickets);

       
    const updateImages = async () => {
      if (selectedFile && tickets.length > 0) { 
        const firstTicket = tickets[0]; 
        console.log(firstTicket);
        
        const imageUpdateResult = await uploadImageForTicket(firstTicket.Image, selectedFile);
        return imageUpdateResult; 
      } else {
        console.error("No file selected or no tickets available.");
        return null; 
      }
    };
      
      try {
        const imageUpdateSuccess = await updateImages(); 
        console.log("Image update success:", imageUpdateSuccess);
        console.log("Images uploaded successfully (simulated).");

        const createTicketPromises = async (ticket: any) => {
          await fetch(`http://${process.env.NEXT_PUBLIC_API_URL}/api/Ticket/create`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(ticket),
          });
        };

        await createTicketPromises(tickets);
        console.log("Tickets created successfully.");
      } catch (error) {
        console.error("Error creating tickets or uploading images:", error);
      }
      setFormData(initialFormData);
      setSelectedFile(null);
      setQrFiles([]);
      setQuantity(1);
      setQrFileNames([]);
      setImagePreview(null);
    };
    await createTickets();
    router.push("/sell");
    window.location.href = "/sell";
  };

  const handleCancel = () => {
    setFormData(initialFormData);
    setSelectedFile(null);
    setQrFiles([]);
    setQuantity(1);
    setQrFileNames([]);
    setImagePreview(null);
    router.push("/sell");
    window.location.href = "/sell";
  };

  

  return (
    <div>
      <Box className="modal-style">
        <div className="modal-contentt">
          <ScrollToTopButton />
          <h2>Thêm Vé</h2>
          <TextField
            className="custom-text-field"
            fullWidth
            label="Số lượng"
            value={quantity}
            onChange={(e) => handleQuantityChange(Number(e.target.value))}
            type="number"
            margin="normal"
            inputProps={{ min: 1 }}
          />

          {/* File input for image */}

          <div className="upload-container">
            <Typography
              variant="h6"
              margin="normal"
              style={{ fontSize: "20px" }}
            >
              Tải lên hình ảnh:
            </Typography>

            <div className="row p-3 justify-between">
              <div
                className="col-md-5 p-0  mb-4  upload-box large-box "
                onClick={() =>
                  document.getElementById("ticketImageInput")?.click()
                }
              >
                <div>
                  <input
                    id="ticketImageInput"
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    style={{ display: "none" }}
                    placeholder="Ticket image"
                    required
                  />
                  {!imagePreview && (
                    <div className="text-center mt-3">
                      <span>Hình ảnh vé</span>
                    </div>
                  )}

                  {imagePreview && (
                    <div className="image-preview mt-3 rounded-lg">
                      <img
                        src={imagePreview}
                        alt="Selected image preview"
                        className="img-fluid"
                        style={{ width: "100%", height: "42vh" }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="col-md-5 p-3 mb-4 upload-box small-box">
                {Array.from({ length: quantity }).map((_, index) => (
                  <div key={index}>
                    <input
                      id={`qrImageInput${index}`}
                      type="file"
                      onChange={(event) => handleQrFileChange(index, event)}
                      accept="image/*"
                      multiple
                      style={{ display: "none" }}
                      required
                    />
                    <div className="text-center qr-text">
                      <span>Hình ảnh QR {index + 1}</span>
                    </div>

                    {!qrFiles[index] && (
                      <div
                        className="items-center qr-image-box"
                        onClick={() =>
                          document
                            .getElementById(`qrImageInput${index}`)
                            ?.click()
                        }
                      />
                    )}
                    {qrFiles[index] && (
                      <div
                        className="qr-preview mt-3"
                        onClick={() =>
                          document
                            .getElementById(`qrImageInput${index}`)
                            ?.click()
                        }
                      >
                        <img
                          src={qrFiles[index]}
                          alt={`QR Code ${index + 1}`}
                          className="img-fluid"
                          style={{ maxWidth: "40%", height: "auto" }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <TextField
            className="custom-text-field"
            fullWidth
            label="Tên"
            name="name"
            value={formData.name}
            onChange={handleChange}
            margin="normal"
            type="string"
            required
          />

            <TextField
              className="custom-text-field"
              fullWidth
              label="Giá"
              name="cost"
              value={formData.cost}
              onChange={handleChange}
              margin="normal"
              type="number"
              required
            />
          {/* Location (Province, District, Ward) */}

          <AddressFields  houseNumber={houseNumber} setHouseNumber={setHouseNumber} setFormData={setFormData} />
          <TextField
            className="custom-text-field"
            label="Vui lòng chọn địa chỉ"
            value={formData.location}
            margin="normal"
            fullWidth
            required
            disabled={true}
          />
          <TextField
            className="custom-text-field"
            fullWidth
            label="Ngày và giờ"
            name="date"
            value={formData.date}
            onChange={handleChange}
            margin="normal"
            type="datetime-local"
            InputLabelProps={{
              shrink: true,
            }}
            required
            inputProps={{
              min: minDateTime,
            }}
          />
          {/* Autocomplete for selecting multiple categories */}
          <Autocomplete
            multiple
            options={categories}
            getOptionLabel={(option: Category) => option.name}
            value={formData.categories}
            onChange={handleCategoriesChange}
            renderInput={(params) => (
              <TextField
                className="custom-text-field"
                {...params}
                label="Danh mục"
                margin="normal"
              />
            )}
            loading={loading}
            isOptionEqualToValue={(option, value) =>
              option.categoryId === value.categoryId
            }
          />
          <div className="border rounded-md mb-4 ">
            <div className="custom-text-field">
              <RichTextEditor
                name="description"
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </div>

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
            <Button variant="outlined" onClick={handleCancel}>
              Hủy
            </Button>
            <Button variant="contained" onClick={handleSave}>
              Lưu
            </Button>
          </Box>
        </div>
      </Box>
    </div>
  );
};

export default AddTicketModal;
