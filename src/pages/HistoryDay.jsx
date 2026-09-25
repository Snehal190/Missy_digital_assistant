import { useParams } from "react-router-dom";
import BackHeader from "../components/layout/BackHeader";
import DayDetail from "../components/history/DayDetail";

export default function HistoryDay() {
  const { date } = useParams();
  return (
    <div className="space-y-5">
      <BackHeader to="/history" eyebrow="History" title="Day detail" />
      <DayDetail date={date} />
    </div>
  );
}
