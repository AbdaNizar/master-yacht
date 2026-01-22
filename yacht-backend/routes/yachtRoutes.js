const {Router} = require("express");
const {createYacht, getAllYachts, getMyYachts, deleteYacht, togglePublicStatus, getYachtById, updateYacht,
    getPublicYachts, getYachtByIdToClient
} = require("../controllers/yachtController");
const {protect, areAuthorized} = require("../middlewares/authMiddleware");

const router = Router();


router.post('/',protect ,areAuthorized(["owner"]),createYacht );
router.get('/',protect ,areAuthorized(["owner",'admin']),getAllYachts );
router.get('/me',protect ,areAuthorized(["owner"]),getMyYachts );
router.get('/byId/:id',protect ,areAuthorized(["owner",'client']),getYachtById );
router.get('/byId/to/client/:id',protect ,areAuthorized(["client"]),getYachtByIdToClient );
router.get('/client/all/public',getPublicYachts );
router.post('/:id/check/availability',protect ,areAuthorized(["client"]),getPublicYachts );
router.put('/:id',protect ,areAuthorized(["owner"]),updateYacht );
router.delete('/:id',protect ,areAuthorized(["owner"]),deleteYacht );
router.put('/:id/public', protect, areAuthorized('owner'), togglePublicStatus);


module.exports = router;
