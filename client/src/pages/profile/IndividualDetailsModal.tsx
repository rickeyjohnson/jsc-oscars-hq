import { useNavigate, useParams } from 'react-router-dom';
import Modal from '../../components/Modal';

const IndividualDetailsModal = () => {
    const { userId } = useParams();
  const navigate = useNavigate();
  return (
    <Modal onClose={() => navigate(-1)}>
      <h2 className="text-lg font-bold">User Profile</h2>
      <p>ID: {userId}</p>
      <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-zinc-700 rounded">
        Close
      </button>
    </Modal>
  )
}

export default IndividualDetailsModal