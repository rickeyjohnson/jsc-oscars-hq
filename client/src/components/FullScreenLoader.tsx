import { LoaderCircle } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

const FullScreenLoader = ({
    title,
    description,
}: {
    title?: string
    description?: string
}) => {
    return (
        <>
            <AnimatePresence>
                <motion.div
                    key="deletition-confirmation-container"
                    initial={{ y: 0, opacity: 1 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{
                        y: "-110%",
                        opacity: 0,
                        scale: 0.96,
                        filter: "blur(6px)",
                        transition: {
                            duration: 1.25,
                            ease: [0.22, 1, 0.36, 1],
                        },
                    }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-6 h-screen"
                >
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <motion.div
                        className={`relative w-full max-w-[80vw] flex items-center justify-center flex-col`}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                    >
                        <h2 className="font-bold">{title}</h2>
                        <p className="text-[#fffadd]/60 mt-2">{description}</p>

                        <div className="flex mt-4 gap-4">
                            <LoaderCircle className="animate-spin w-5 h-5" />
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        </>
    )
}

export default FullScreenLoader
