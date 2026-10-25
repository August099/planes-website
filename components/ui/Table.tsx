export const Table = ({ columns, rows } : {columns: string[], rows: string[][]}) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#00205B]">
                <thead className="bg-[#00205B]/5 border-b border-[#00205B]/10 text-[11px] uppercase font-bold text-[#00205B]/70">
                    <tr>
                        {columns.map((col, index) => (
                            <th key={`column-${index}`} className="p-4">{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#00205B]/10">
                    {rows.map((row, index) => (
                        <tr key={`row-${index}`} className="hover:bg-white/60 transition-colors">
                            {row.map((data, index) => (
                                <td key={`cell-${index}`} className="p-4">
                                    {data}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// celda para admins (por ahora sin uso)
/*
<td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                <form action={toggleAdminRole}>
                                    <input type="hidden" name="userId" value={u.id} />
                                    <input
                                    type="hidden"
                                    name="currentIsAdmin"
                                    value={String(u.isAdmin)}
                                    />
                                    <Button
                                    type="submit"
                                    size="sm"
                                    variant="outline"
                                    className="text-[11px] rounded-lg border-[#00205B]/20 h-8"
                                    >
                                    {u.isAdmin ? "Quitar Admin" : "Hacer Admin"}
                                    </Button>
                                </form>

                                {currentUser?.id !== u.id && (
                                    <form action={deleteUser}>
                                    <input type="hidden" name="userId" value={u.id} />
                                    <Button
                                        type="submit"
                                        size="sm"
                                        variant="destructive"
                                        className="text-[11px] rounded-lg h-8 bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        Eliminar
                                    </Button>
                                    </form>
                                )}
                                </div>
                            </td>*/