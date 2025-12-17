export function downloadPDF(base64Data, filename = "challan.pdf") {
  const link = document.createElement("a");
  link.href = `data:application/pdf;base64,${base64Data}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
// On button click for SI batch:
const handleDownloadChallan = async (stockInNo) => {
  const res = await API.get(`/stock-in/challan/${stockInNo}`);
  if (res.data && res.data.challan) {
    downloadPDF(res.data.challan, `StockInChallan_${stockInNo}.pdf`);
  } else {
    toast.error("Challan not available");
  }
};
